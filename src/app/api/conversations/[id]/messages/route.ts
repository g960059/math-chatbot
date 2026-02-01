import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_MODEL, DEFAULT_MODEL_OPTIONS } from '@/types'
import type { ModelOptions } from '@/types'
import { E2E_MOCK_MESSAGES } from '@/lib/e2e-mocks'

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
    const mockResponse = `マシュケの定理（Maschke's Theorem）は、群表現論における基本定理で、「有限群の表現が完全可約であるための条件」を与えます。

この定理の本質は、**表現の「部分空間」があったとき、その「補空間」もまた表現（不変部分空間）として取れること**を保証することにあります。これを可換図式を用いて説明します。

---

### 1. 定理の主張

群 $G$ を有限群、$K$ を体とし、その標数 $\\text{char}(K)$ が $G$ の位数 $|G|$ を割り切らないとします。
このとき、$G$ の任意の有限次元表現 $V$ に対して、不変部分空間 $U \\subset V$ があれば、それに対する $G$ 不変な補空間 $W$ が存在し、$V = U \\oplus W$ と直和分解できます。

### 2. 図式によるアプローチ

この定理を証明・理解する鍵は、線形写像としての「射影」を表現の準同型（$G$-線形写像）に変換することにあります。

#### (1) 線形空間としての短完全系列
まず、$U$ が $V$ の部分空間であるとき、次のベクトル空間の短完全系列が存在します。
$$
0 \\xrightarrow{} U \\xrightarrow{i} V \\xrightarrow{p} V/U \\xrightarrow{} 0
$$
ここで $i$ は包含写像です。この系列が**表現の圏において分裂（split）すること**を示せば、定理が証明されたことになります。

#### (2) 射影の平均化
線形空間としては、単に $U$ への射影 $q: V \\to U$ （$q \\circ i = \\text{id}_U$ を満たすもの）は必ず存在しますが、これは一般に $G$ 不変ではありません。
そこで、平均化作用素を用いて新しい写像 $\\tilde{q}$ を作ります：
$$\\tilde{q} = \\frac{1}{|G|} \\sum_{g \\in G} g \\cdot q \\cdot g^{-1}$$

この $\\tilde{q}$ は $G$-線形写像（表現の準同型）になり、かつ $U$ の元を動かしません。

#### (3) 可換図式
この状況を可換図式で表すと以下のようになります。

\`\`\`tikz
\\begin{tikzcd}
0 \\arrow[r] & U \\arrow[r, "i"] \\arrow[d, "\\text{id}_U"'] & V \\arrow[r, "p"] \\arrow[dl, "\\tilde{q}"] & V/U \\arrow[r] & 0 \\\\
& U & & & 
\\end{tikzcd}
\`\`\`

この図式において、$\\tilde{q} \\circ i = \\text{id}_U$ が成立します。圏論の言葉で言えば、**「包含写像 $i$ がレトラクション $\\tilde{q}$ を持つ」**ことを意味します。

### 3. 直和分解の成立

$\\tilde{q} \\circ i = \\text{id}_U$ が成り立つとき、核 $W = \\ker(\\tilde{q})$ を取れば、表現 $V$ は次のように分解されます。

\`\`\`tikz
\\begin{tikzcd}
V \\arrow[r, "\\cong"] & U \\oplus \\ker(\\tilde{q})
\\end{tikzcd}
\`\`\`

$$V = U \\oplus W$$

ここで $W$ も $G$ 不変部分空間（表現）となります。これにより、任意の表現は既約表現の直和に分解できる（完全可約）ことが導かれます。

### まとめ
マシュケの定理を可換図式で捉えるポイントは：
1.  **短完全系列** $0 \\to U \\to V \\to V/U \\to 0$ が $G$-加群の圏で定義される。
2.  平均化によって、この系列を左から割る**レトラクション $\\tilde{q}: V \\to U$** が作れる。
3.  その結果、系列が**分裂（split）**し、$V \\cong U \\oplus W$ という構造が導かれる。

という流れになります。標数の条件 $\\text{char}(K) \\nmid |G|$ は、平均化の際の「$|G|$ で割る」という操作を正当化するために必要です。`

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
