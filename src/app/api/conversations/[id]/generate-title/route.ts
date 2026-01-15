import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user settings for API key
  const { data: settings } = await supabase
    .from('user_settings')
    .select('openrouter_api_key')
    .eq('user_id', user.id)
    .single()

  const apiKey = (settings as { openrouter_api_key: string | null } | null)?.openrouter_api_key

  if (!apiKey) {
    return NextResponse.json(
      { error: 'APIキーが設定されていません' },
      { status: 400 }
    )
  }

  // Get first few messages from conversation
  const { data: messagesData } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(4)

  const messages = messagesData as { role: string; content: string }[] | null

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'No messages found' }, { status: 400 })
  }

  // Generate title using OpenRouter
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Math Study Chatbot',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: '以下の会話の内容を簡潔に要約して、20文字以内の日本語タイトルを生成してください。タイトルのみを出力し、説明や引用符は不要です。',
        },
        {
          role: 'user',
          content: messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
        },
      ],
      max_tokens: 50,
    }),
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    )
  }

  const data = await response.json()
  const title = data.choices?.[0]?.message?.content?.trim() || '新しい会話'

  // Update conversation title
  const { data: conversation, error } = await supabase
    .from('conversations')
    .update({ title } as Record<string, unknown>)
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(conversation)
}
