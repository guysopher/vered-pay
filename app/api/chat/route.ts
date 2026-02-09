import { NextRequest } from 'next/server'
import { chatWithPayrollContext } from '@/lib/claude'
import { buildChatContext } from '@/lib/chat-context'
import { ensureDB } from '@/lib/db'
import type { ChatMessage } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    await ensureDB()
    const { messages } = (await request.json()) as { messages: ChatMessage[] }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'לא התקבלה הודעה' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const dataContext = await buildChatContext()
    const anthropicStream = await chatWithPayrollContext(messages, dataContext)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicStream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                    )
                  }
                } catch {
                  // skip unparseable lines
                }
              }
            }
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'שגיאה' })}\n\n`
            )
          )
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ error: 'שגיאה בעיבוד ההודעה' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
