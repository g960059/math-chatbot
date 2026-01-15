'use client'

import { useState } from 'react'
import { Plus, MessageSquare, Settings, Trash2, Menu, X, LogOut } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { Conversation } from '@/types'

interface SidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onOpenSettings: () => void
  onLogout: () => void
  isMobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  onLogout,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDeleteConversation(id)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:relative z-50 md:z-0',
          'w-64 h-screen md:h-full bg-[var(--sidebar-bg)] border-r border-[var(--border-color)]',
          'flex flex-col overflow-hidden',
          'transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <span className="font-semibold">会話一覧</span>
            <button
              onClick={onMobileClose}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>新規会話</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              会話がありません
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectConversation(conversation.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectConversation(conversation.id)
                      }
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors group cursor-pointer',
                      currentConversationId === conversation.id
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {conversation.title || '新しい会話'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(conversation.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(conversation.id)
                      }}
                      className={cn(
                        'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                        deleteConfirm === conversation.id
                          ? 'bg-red-500 text-white opacity-100'
                          : 'hover:bg-gray-300 dark:hover:bg-gray-600'
                      )}
                      title={
                        deleteConfirm === conversation.id
                          ? 'もう一度クリックで削除'
                          : '削除'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-[var(--border-color)]">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-500" />
            <span>設定</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-red-500"
          >
            <LogOut className="w-5 h-5" />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
    >
      <Menu className="w-6 h-6" />
    </button>
  )
}
