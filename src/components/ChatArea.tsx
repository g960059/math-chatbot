'use client'

import { useRef, useEffect, useState, FormEvent } from 'react'
import { Send, User, Bot, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageContent } from './MessageContent'
import type { Message } from '@/types'

interface ChatAreaProps {
  messages: Message[]
  streamingContent: string | null
  isLoading: boolean
  onSendMessage: (content: string) => void
}

export function ChatArea({
  messages,
  streamingContent,
  isLoading,
  onSendMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    onSendMessage(input.trim())
    setInput('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !isComposingRef.current &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleCompositionStart = () => {
    isComposingRef.current = true
  }

  const handleCompositionEnd = () => {
    isComposingRef.current = false
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current))
      }, 1500)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0" ref={messagesContainerRef}>
        {messages.length === 0 && !streamingContent ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">
                Math Study Chatbot
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                圏論を含む数学の学習をサポートします。
                <br />
                数式や可換図式も表示できます。
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4 px-4">
            {messages.map((message) => {
              const hasTikz = /\\begin\{tikz|```tikz/i.test(message.content)
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3 mb-6',
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      message.role === 'user'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 min-w-0',
                      message.role === 'user'
                        ? 'bg-[var(--user-message-bg)] text-white max-w-[85%]'
                        : hasTikz
                          ? 'bg-[var(--assistant-message-bg)] w-full max-w-full'
                          : 'bg-[var(--assistant-message-bg)] max-w-[85%]'
                    )}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            aria-label="Markdownをコピー"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                コピー済み
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                コピー
                              </>
                            )}
                          </button>
                        </div>
                        <MessageContent content={message.content} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Streaming message */}
            {streamingContent && (
              <div className="flex gap-3 mb-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                  <Bot className="w-5 h-5" />
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 bg-[var(--assistant-message-bg)] min-w-0',
                    /\\begin\{tikz|```tikz/i.test(streamingContent)
                      ? 'w-full max-w-full'
                      : 'max-w-[85%]'
                  )}
                >
                  <MessageContent content={streamingContent} isStreaming />
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-[var(--border-color)] p-4 pb-[env(safe-area-inset-bottom,16px)]">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="メッセージを入力... (Shift+Enterで改行)"
                className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent min-h-[48px] max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                input.trim() && !isLoading
                  ? 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
