/**
 * API для генерации ключевых слов по нише через AI
 *
 * POST /api/pain-radar/niche-keywords
 * Body: { niche: string }
 * Response: { keywords: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

interface KeywordsRequest {
  niche: string
}

interface KeywordsResponse {
  keywords: string[]
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    const { niche }: KeywordsRequest = await req.json()

    if (!niche || typeof niche !== 'string' || niche.trim().length === 0) {
      return NextResponse.json(
        { error: 'Ниша не указана' },
        { status: 400 }
      )
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY не настроен' },
        { status: 500 }
      )
    }

    const prompt = `Ты эксперт по анализу болей и проблем в бизнесе.

Ниша/Сфера бизнеса: "${niche}"

Твоя задача: сгенерировать список из 10-15 ключевых слов и фраз на русском языке, по которым нужно искать упоминания проблем, болей и сложностей в этой нише.

Ключевые слова должны быть:
- Связаны с проблемами, сложностями, болями в этой нише
- На русском языке
- Разнообразными (общие проблемы, специфичные термины, жаргон)
- Фокусированы на поиске негатива и проблем

Примеры форматов:
- "проблема [термин]"
- "сложно [действие]"
- "[термин] не работает"
- "боль [аудитория]"
- конкретные термины ниши

Верни ТОЛЬКО массив ключевых слов в формате JSON, без дополнительного текста:
["ключевое слово 1", "ключевое слово 2", ...]`

    // Пробуем модели по очереди
    const models = [
      'google/gemini-2.0-flash-exp:free',
      'anthropic/claude-3.5-haiku',
      'openai/gpt-4o-mini',
    ]

    let lastError: Error | null = null

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
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        })

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
          throw new Error('Empty response from AI')
        }

        // Парсим JSON из ответа
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }

        const keywords: string[] = JSON.parse(jsonMatch[0])

        if (!Array.isArray(keywords) || keywords.length === 0) {
          throw new Error('Invalid keywords format')
        }

        return NextResponse.json({
          keywords: keywords.filter((k) => typeof k === 'string' && k.trim().length > 0),
        })
      } catch (error: any) {
        console.error(`Failed with model ${model}:`, error)
        lastError = error
        // Пробуем следующую модель
        continue
      }
    }

    // Все модели не сработали
    throw lastError || new Error('All AI models failed')
  } catch (error: any) {
    console.error('Niche keywords generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка генерации ключевых слов' },
      { status: 500 }
    )
  }
}
