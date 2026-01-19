import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/ai/stream
 * Streaming AI responses using SSE
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { prompt, systemPrompt, maxTokens = 2000 } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const anthropic = new Anthropic({ apiKey })

    // Create a streaming response using SSE
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Start streaming in background
    ;(async () => {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          system: systemPrompt || 'Ты полезный ассистент для консалтинговой CRM-системы. Отвечай на русском языке.',
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const data = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
            await writer.write(encoder.encode(data))
          }
        }

        await writer.write(encoder.encode('data: [DONE]\n\n'))
      } catch (error) {
        console.error('Streaming error:', error)
        const errorData = `data: ${JSON.stringify({ error: 'Streaming error' })}\n\n`
        await writer.write(encoder.encode(errorData))
      } finally {
        await writer.close()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in AI stream:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
