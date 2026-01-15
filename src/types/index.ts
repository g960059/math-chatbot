export interface User {
  id: string
  email: string
}

export interface ModelOptions {
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

export interface UserSettings {
  id: string
  user_id: string
  openrouter_api_key: string | null
  selected_model: string
  custom_models: string[] // User-added custom model IDs
  model_options: ModelOptions
  math_renderer: 'mathjax' | 'katex'
  theme: 'dark' | 'light'
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
}

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  model: string
}

export interface StreamingResponse {
  id: string
  choices: {
    delta: {
      content?: string
    }
    finish_reason: string | null
  }[]
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: UserSettings
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at' | 'updated_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id' | 'created_at'>>
      }
    }
  }
}

// Default models list
export const DEFAULT_MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
  { id: 'z-ai/glm-4.7', name: 'GLM 4.7' },
  { id: 'openai/gpt-5.2-pro', name: 'GPT-5.2 Pro' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2' },
] as const

export const DEFAULT_MODEL = 'google/gemini-3-flash-preview'

export const DEFAULT_MODEL_OPTIONS: ModelOptions = {
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
}
