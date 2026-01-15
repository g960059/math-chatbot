import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_MODEL, DEFAULT_MODEL_OPTIONS } from '@/types'
import type { ModelOptions } from '@/types'

// E2E test mock data
const E2E_MOCK_MESSAGES: Record<string, Array<{ id: string; conversation_id: string; role: string; content: string; created_at: string }>> = {}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // E2E test mode
  if (process.env.E2E_TEST_MODE === 'true') {
    return NextResponse.json(E2E_MOCK_MESSAGES[id] || [])
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify conversation belongs to user
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(messages)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const { content } = await request.json()

  // E2E test mode - simulate streaming response
  if (process.env.E2E_TEST_MODE === 'true') {
    if (!E2E_MOCK_MESSAGES[conversationId]) {
      E2E_MOCK_MESSAGES[conversationId] = []
    }
    
    // Add user message
    E2E_MOCK_MESSAGES[conversationId].push({
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    })

    // Simulate AI response with streaming
    const mockResponse = String.raw`マシュケの定理を、圏論的な視点（可換図式と完全系列の分裂）から分かりやすく解説します。

マシュケの定理の本質は、**「ベクトル空間の圏（$Vect$）で分裂している完全系列が、群表現の圏（$Rep_G$）でも分裂するように修正できる」**という点にあります。

---

### 1. 前提となる図式：短完全系列

$G$ を有限群、$k$ を体（標数は $|G|$ を割り切らない）とします。$V$ を $G$-表現（$G$-加群）、$U$ をその $G$-部分表現とすると、次の $G$-線形写像による**短完全系列**が存在します。

$$
\begin{tikzcd}
0 \arrow[r] & U \arrow[r, "\iota"] & V \arrow[r, "\pi"] & V/U \arrow[r] & 0
\end{tikzcd}
$$

ここで、$\iota$ は包含写像、$\pi$ は自然な全射です。

### 2. ステップ1：ベクトル空間としての分裂（レトラクションの存在）

$V$ を単なるベクトル空間（$G$ の作用を忘れたもの）として見ると、部分空間 $U$ に対して必ず補空間が存在します。つまり、次を満たす**線形写像** $p: V \to U$ が存在します。

$$
\begin{tikzcd}
0 \arrow[r] & U \arrow[r, "\iota"] & V \arrow[l, "p"', bend right]
\end{tikzcd}
\quad \text{where } p \circ \iota = \text{id}_U
$$

しかし、この $p$ は一般に $G$ の作用と可換ではありません（$G$-線形ではない）。

### 3. ステップ2：平均化による $G$-線形写像の構成

マシュケの定理の核心は、この $p$ を「平均化」して $G$-線形な $\bar{p}$ を作ることです。
$$\bar{p}(v) = \frac{1}{|G|} \sum_{g \in G} g \cdot p(g^{-1} \cdot v)$$

このとき、$\bar{p}$ は $G$-線形写像（$G$-加群の射）となり、かつ依然として $U$ 上では恒等写像です。これを図式で表すと以下のようになります。

$$
\begin{tikzcd}[column sep=large, row sep=large]
V \arrow[d, "g"'] \arrow[r, "\bar{p}"] & U \arrow[d, "g"] \\
V \arrow[r, "\bar{p}"] & U
\end{tikzcd}
\quad \text{かつ} \quad
\begin{tikzcd}
U \arrow[r, "\iota"] \arrow[rd, "\text{id}_U"'] & V \arrow[d, "\bar{p}"] \\
& U
\end{tikzcd}
$$

左の図式は $\bar{p}$ が $G$-作用と可換であることを示し、右の図式は $\bar{p}$ が包含写像 $\iota$ の**レトラクション（左逆射）**であることを示しています。

### 4. ステップ3：完全系列の分裂

$G$-加群の圏においてレトラクション $\bar{p}$ が存在するため、分裂補助定理（Splitting Lemma）により、最初の短完全系列は**分裂**します。

$$
\begin{tikzcd}
0 \arrow[r] & U \arrow[r, "\iota", shift left=1.5] & V \arrow[l, "\bar{p}", shift left=1.5] \arrow[r, "\pi", shift left=1.5] & V/U \arrow[r] \arrow[l, "s", shift left=1.5] & 0
\end{tikzcd}
$$

この図式が意味するのは、以下の同型が存在することです。
$$V \cong U \oplus \ker(\bar{p})$$
ここで、$\ker(\bar{p})$ も $G$-部分表現となります。

### 結論

マシュケの定理を可換図式の言葉でまとめると：

> 「$|G|$ が $k$ で可逆であるとき、$G$-表現の圏における任意の短完全系列
> $$0 \to U \to V \to W \to 0$$
> は分裂する。」

これは、すべての表現が既約表現の直和として書ける（半単純である）ことを意味しており、表現論における最も重要な基礎の一つとなっています。`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Stream the response character by character with delay
        for (let i = 0; i < mockResponse.length; i += 5) {
          const chunk = mockResponse.slice(i, i + 5)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
          await new Promise(resolve => setTimeout(resolve, 20))
        }
        
        // Add assistant message
        E2E_MOCK_MESSAGES[conversationId].push({
          id: `msg-${Date.now()}`,
          conversation_id: conversationId,
          role: 'assistant',
          content: mockResponse,
          created_at: new Date().toISOString(),
        })
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify conversation belongs to user
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Get user settings for API key, model, and model options
  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('openrouter_api_key, selected_model, model_options')
    .eq('user_id', user.id)
    .single()

  const settings = settingsData as {
    openrouter_api_key: string | null
    selected_model: string | null
    model_options: ModelOptions | null
  } | null

  if (!settings?.openrouter_api_key) {
    return NextResponse.json(
      { error: 'APIキーが設定されていません。設定画面からAPIキーを設定してください。' },
      { status: 400 }
    )
  }

  const modelOptions = settings.model_options || DEFAULT_MODEL_OPTIONS

  // Save user message
  const { error: userMessageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    })
    .select()
    .single()

  if (userMessageError) {
    return NextResponse.json({ error: userMessageError.message }, { status: 500 })
  }

  // Get all messages for context
  const { data: allMessages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  // Stream response from OpenRouter
  const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.openrouter_api_key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Math Study Chatbot',
    },
    body: JSON.stringify({
      model: settings.selected_model || DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: `あなたは圏論を含む数学の学習を支援するAIアシスタントです。
数式はLaTeX記法で表現してください。インライン数式は$...$、ブロック数式は$$...$$を使用してください。
可換図式はtikz-cd記法で表現することができます。
日本語で丁寧に説明してください。`,
        },
        ...((allMessages as { role: string; content: string }[] | null) || []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      stream: true,
      // Model options
      temperature: modelOptions.temperature,
      max_tokens: modelOptions.max_tokens,
      top_p: modelOptions.top_p,
      frequency_penalty: modelOptions.frequency_penalty,
      presence_penalty: modelOptions.presence_penalty,
    }),
  })

  if (!openRouterResponse.ok) {
    const errorData = await openRouterResponse.json().catch(() => ({}))
    return NextResponse.json(
      { error: errorData.error?.message || 'OpenRouter API error' },
      { status: openRouterResponse.status }
    )
  }

  // Create streaming response
  const encoder = new TextEncoder()
  let fullContent = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openRouterResponse.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      const decoder = new TextDecoder()

      try {
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
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  fullContent += content
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }

        // Save assistant message to database
        if (fullContent) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullContent,
          })

          // Update conversation timestamp
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() } as Record<string, unknown>)
            .eq('id', conversationId)
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        console.error('Streaming error:', error)
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
