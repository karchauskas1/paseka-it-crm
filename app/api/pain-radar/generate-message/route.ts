/**
 * API для генерации продающих сообщений на основе проблем
 *
 * POST /api/pain-radar/generate-message
 * Body: { problem, niche, solution?, tone? }
 * Response: { message, variants }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

interface MessageRequest {
  problem: string // Описание проблемы из анализа
  niche: string // Ниша бизнеса
  solution?: string // Опциональное решение
  tone?: 'professional' | 'casual' | 'empathetic' // Тон сообщения
}

interface MessageResponse {
  message: string
  variants: string[]
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: MessageRequest = await req.json()
    const { problem, niche, solution, tone = 'empathetic' } = body

    if (!problem || !niche) {
      return NextResponse.json(
        { error: 'Problem and niche required' },
        { status: 400 }
      )
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      )
    }

    const toneDescriptions = {
      professional: 'профессиональный деловой стиль',
      casual: 'дружелюбный неформальный стиль',
      empathetic: 'эмпатичный понимающий стиль',
    }

    const prompt = `Ты — копирайтер, специализирующийся на создании продающих сообщений на основе реальных проблем клиентов.

ИСХОДНЫЕ ДАННЫЕ:
- Ниша: ${niche}
- Проблема клиентов: ${problem}
${solution ? `- Наше решение: ${solution}` : ''}
- Тон коммуникации: ${toneDescriptions[tone]}

ЗАДАЧА:
Создай 3 варианта продающего сообщения, которое:
1. Показывает понимание проблемы клиента
2. ${solution ? 'Предлагает конкретное решение' : 'Приглашает к диалогу о решении'}
3. Мотивирует к действию (написать, позвонить, узнать подробнее)
4. Написано в указанном тоне
5. Длина 2-4 предложения

ФОРМАТ ОТВЕТА (строго JSON):
{
  "variants": [
    "Вариант 1...",
    "Вариант 2...",
    "Вариант 3..."
  ]
}

Отвечай ТОЛЬКО JSON, без markdown и пояснений.`

    const models = [
      'google/gemini-2.0-flash-exp:free',
      'anthropic/claude-3.5-haiku',
      'openai/gpt-4o-mini',
    ]

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'PASEKA IT CRM - Pain Radar',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 1000,
          }),
        })

        if (!response.ok) {
          console.error(`Model ${model} failed:`, response.status)
          continue
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) continue

        const jsonStr = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        const parsed = JSON.parse(jsonStr)
        const variants = parsed.variants || []

        if (!Array.isArray(variants) || variants.length === 0) {
          continue
        }

        return NextResponse.json({
          message: variants[0], // Основной вариант
          variants: variants.filter((v: any) => typeof v === 'string'),
        })
      } catch (error) {
        console.error(`Failed with model ${model}:`, error)
        continue
      }
    }

    throw new Error('All AI models failed')
  } catch (error: any) {
    console.error('[Generate Message] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Message generation failed' },
      { status: 500 }
    )
  }
}
