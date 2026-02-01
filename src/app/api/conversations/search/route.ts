import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { E2E_MOCK_CONVERSATIONS, E2E_MOCK_MESSAGES } from '@/lib/e2e-mocks'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query || query.trim() === '') {
    return NextResponse.json([])
  }

  // E2E test mode
  if (process.env.E2E_TEST_MODE === 'true') {
    const pattern = query.trim().toLowerCase()
    const results = E2E_MOCK_CONVERSATIONS
      .filter((conv) => {
        if (conv.title.toLowerCase().includes(pattern)) return true
        const messages = E2E_MOCK_MESSAGES[conv.id] || []
        return messages.some((m) => m.content.toLowerCase().includes(pattern))
      })
      .map((conv) => {
        const messages = E2E_MOCK_MESSAGES[conv.id] || []
        const matchingMessage = messages.find((m) => m.content.toLowerCase().includes(pattern))
        const snippet = matchingMessage
          ? (matchingMessage.content.length <= 120 ? matchingMessage.content : matchingMessage.content.slice(0, 120) + '…')
          : null
        return { ...conv, snippet }
      })
    return NextResponse.json(results)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('search_conversations', {
    query: query.trim(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
