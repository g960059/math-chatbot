import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// E2E test mock data
const E2E_TEST_USER_ID = 'e2e-test-user-id'
const E2E_MOCK_CONVERSATIONS = [
  { id: 'e2e-conv-1', user_id: E2E_TEST_USER_ID, title: 'テスト会話1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export async function GET() {
  // E2E test mode
  if (process.env.E2E_TEST_MODE === 'true') {
    return NextResponse.json(E2E_MOCK_CONVERSATIONS)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(conversations)
}

export async function POST() {
  // E2E test mode
  if (process.env.E2E_TEST_MODE === 'true') {
    const newConv = { 
      id: `e2e-conv-${Date.now()}`, 
      user_id: E2E_TEST_USER_ID, 
      title: '新しい会話', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    }
    E2E_MOCK_CONVERSATIONS.unshift(newConv)
    return NextResponse.json(newConv)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: '新しい会話',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(conversation)
}
