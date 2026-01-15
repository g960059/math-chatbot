'use client'

import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Sun, Moon, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserSettings, ModelOptions } from '@/types'
import { DEFAULT_MODELS, DEFAULT_MODEL, DEFAULT_MODEL_OPTIONS } from '@/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: UserSettings | null
  onSave: (settings: Partial<UserSettings>) => Promise<void>
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [customModels, setCustomModels] = useState<string[]>([])
  const [newModelId, setNewModelId] = useState('')
  const [modelOptions, setModelOptions] = useState<ModelOptions>(DEFAULT_MODEL_OPTIONS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mathRenderer, setMathRenderer] = useState<'katex' | 'mathjax'>('katex')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setApiKey(settings.openrouter_api_key || '')
      setSelectedModel(settings.selected_model || DEFAULT_MODEL)
      setCustomModels(settings.custom_models || [])
      setModelOptions(settings.model_options || DEFAULT_MODEL_OPTIONS)
      setMathRenderer(settings.math_renderer || 'katex')
      setTheme(settings.theme || 'light')
    }
  }, [settings])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleAddCustomModel = () => {
    if (newModelId.trim() && !customModels.includes(newModelId.trim())) {
      const updatedModels = [...customModels, newModelId.trim()]
      setCustomModels(updatedModels)
      setNewModelId('')
    }
  }

  const handleRemoveCustomModel = (modelId: string) => {
    setCustomModels(customModels.filter((m) => m !== modelId))
    if (selectedModel === modelId) {
      setSelectedModel(DEFAULT_MODEL)
    }
  }

  const handleModelOptionChange = (key: keyof ModelOptions, value: number) => {
    setModelOptions((prev) => ({ ...prev, [key]: value }))
  }

  const allModels = [
    ...DEFAULT_MODELS,
    ...customModels.map((id) => ({ id, name: id })),
  ]

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        openrouter_api_key: apiKey,
        selected_model: selectedModel,
        custom_models: customModels,
        model_options: modelOptions,
        math_renderer: mathRenderer,
        theme,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-[var(--background)] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold">設定</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              OpenRouter APIキー
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-..."
                className="w-full px-4 py-2 pr-10 rounded-lg border border-[var(--border-color)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                OpenRouter
              </a>
              からAPIキーを取得してください
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              AIモデル
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {allModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Custom Model */}
          <div>
            <label className="block text-sm font-medium mb-2">
              カスタムモデルを追加
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="provider/model-name"
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomModel()
                  }
                }}
              />
              <button
                onClick={handleAddCustomModel}
                disabled={!newModelId.trim()}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              OpenRouterのモデルID (例: anthropic/claude-3.5-sonnet)
            </p>

            {/* Custom Models List */}
            {customModels.length > 0 && (
              <div className="mt-3 space-y-2">
                {customModels.map((modelId) => (
                  <div
                    key={modelId}
                    className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  >
                    <span className="text-sm truncate">{modelId}</span>
                    <button
                      onClick={() => handleRemoveCustomModel(modelId)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Model Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              モデルオプション（詳細設定）
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                {/* Temperature */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Temperature</label>
                    <span className="text-sm text-gray-500">{modelOptions.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={modelOptions.temperature ?? 0.7}
                    onChange={(e) => handleModelOptionChange('temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">低い値ほど決定的、高い値ほど創造的</p>
                </div>

                {/* Max Tokens */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Max Tokens</label>
                    <span className="text-sm text-gray-500">{modelOptions.max_tokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="16384"
                    step="256"
                    value={modelOptions.max_tokens ?? 4096}
                    onChange={(e) => handleModelOptionChange('max_tokens', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">応答の最大トークン数</p>
                </div>

                {/* Top P */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Top P</label>
                    <span className="text-sm text-gray-500">{modelOptions.top_p}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={modelOptions.top_p ?? 1}
                    onChange={(e) => handleModelOptionChange('top_p', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">核サンプリング確率</p>
                </div>

                {/* Frequency Penalty */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Frequency Penalty</label>
                    <span className="text-sm text-gray-500">{modelOptions.frequency_penalty}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={modelOptions.frequency_penalty ?? 0}
                    onChange={(e) => handleModelOptionChange('frequency_penalty', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">繰り返しペナルティ（頻度ベース）</p>
                </div>

                {/* Presence Penalty */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium">Presence Penalty</label>
                    <span className="text-sm text-gray-500">{modelOptions.presence_penalty}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={modelOptions.presence_penalty ?? 0}
                    onChange={(e) => handleModelOptionChange('presence_penalty', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">繰り返しペナルティ（存在ベース）</p>
                </div>
              </div>
            )}
          </div>

          {/* Math Renderer */}
          <div>
            <label className="block text-sm font-medium mb-2">
              数式レンダラー
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMathRenderer('katex')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg border transition-colors',
                  mathRenderer === 'katex'
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                KaTeX
              </button>
              <button
                onClick={() => setMathRenderer('mathjax')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg border transition-colors',
                  mathRenderer === 'mathjax'
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                MathJax
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium mb-2">
              テーマ
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                  theme === 'light'
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Sun className="w-4 h-4" />
                ライト
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                  theme === 'dark'
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Moon className="w-4 h-4" />
                ダーク
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-color)]">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
