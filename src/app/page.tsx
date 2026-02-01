'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar, MobileMenuButton, ChatArea, SettingsModal } from '@/components'
import { createClient } from '@/lib/supabase/client'
import type { Conversation, Message, UserSettings, SearchResult } from '@/types'

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)

  // Search conversations
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    const response = await fetch(`/api/conversations/search?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      const data = await response.json()
      setSearchResults(data)
    }
  }, [])

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    const response = await fetch('/api/conversations')
    if (response.ok) {
      const data = await response.json()
      setConversations(data)
    }
  }, [])

  // Fetch messages for current conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(`/api/conversations/${conversationId}/messages`)
    if (response.ok) {
      const data = await response.json()
      setMessages(data)
    }
  }, [])

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    const response = await fetch('/api/settings')
    if (response.ok) {
      const data = await response.json()
      setSettings(data)
      // Apply theme
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchConversations()
    fetchSettings()
  }, [fetchConversations, fetchSettings])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId)
    } else {
      setMessages([])
    }
  }, [currentConversationId, fetchMessages])

  // Create new conversation
  const handleNewConversation = async () => {
    const response = await fetch('/api/conversations', { method: 'POST' })
    if (response.ok) {
      const conversation = await response.json()
      setConversations((prev) => [conversation, ...prev])
      setCurrentConversationId(conversation.id)
      setMessages([])
      setIsMobileMenuOpen(false)
    }
  }

  // Select conversation
  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id)
    setIsMobileMenuOpen(false)
  }

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (response.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (currentConversationId === id) {
        setCurrentConversationId(null)
        setMessages([])
      }
    }
  }

  // Save settings
  const handleSaveSettings = async (updates: Partial<UserSettings>) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (response.ok) {
      const data = await response.json()
      setSettings(data)
    }
  }

  // Logout
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Create conversation if needed
    let conversationId: string = currentConversationId || ''
    if (!currentConversationId) {
      const response = await fetch('/api/conversations', { method: 'POST' })
      if (response.ok) {
        const conversation = await response.json()
        setConversations((prev) => [conversation, ...prev])
        conversationId = conversation.id
        setCurrentConversationId(conversationId)
      } else {
        return
      }
    }

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])
    setIsLoading(true)
    setStreamingContent('')

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      // Read streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                setStreamingContent(fullContent)
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }

      // Update messages with actual response
      await fetchMessages(conversationId)
      setStreamingContent(null)

      // Generate title if this is the first message
      const currentConversation = conversations.find((c) => c.id === conversationId)
      if (currentConversation?.title === '新しい会話') {
        const titleResponse = await fetch(
          `/api/conversations/${conversationId}/generate-title`,
          { method: 'POST' }
        )
        if (titleResponse.ok) {
          const updatedConversation = await titleResponse.json()
          setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? updatedConversation : c))
          )
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      setStreamingContent(null)
      alert(error instanceof Error ? error.message : 'メッセージの送信に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen h-[100dvh] bg-[var(--background)] overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        searchResults={searchResults}
        onSearch={handleSearch}
      />

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] md:hidden">
          <MobileMenuButton onClick={() => setIsMobileMenuOpen(true)} />
          <h1 className="font-semibold truncate">
            {conversations.find((c) => c.id === currentConversationId)?.title ||
              'Math Study Chatbot'}
          </h1>
        </header>

        <ChatArea
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  )
}
