import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
// Use Claude 3 Haiku - much cheaper ($0.25/1M tokens vs $10/1M for GPT-4 Turbo)
const MODEL = 'anthropic/claude-3-haiku'

async function callOpenRouter(messages: Array<{ role: string; content: string }>, maxTokens: number = 200) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

const statusLabels: Record<string, string> = {
  WAITING: 'Ждём ответа',
  RESPONDED: 'Ответил',
  NO_RESPONSE: 'Не ответил',
  FOLLOW_UP: 'Повторно связаться',
  CONVERTED: 'Конвертирован',
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { touchId } = body

    if (!touchId) {
      return NextResponse.json({ error: 'Touch ID required' }, { status: 400 })
    }

    // Get touch data
    const touch = await db.touch.findUnique({
      where: { id: touchId },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    })

    if (!touch) {
      return NextResponse.json({ error: 'Touch not found' }, { status: 404 })
    }

    const prompt = `
Ты - эксперт по продажам и работе с лидами в IT-компании.

Данные о контакте (лиде):
- Имя: ${touch.contactName}
${touch.contactCompany ? `- Компания: ${touch.contactCompany}` : ''}
${touch.contactEmail ? `- Email: ${touch.contactEmail}` : ''}
${touch.contactPhone ? `- Телефон: ${touch.contactPhone}` : ''}
- Источник: ${touch.source || 'Не указан'}
- Статус: ${statusLabels[touch.status] || touch.status}
- Дата контакта: ${touch.contactedAt.toLocaleDateString('ru-RU')}
${touch.description ? `- Описание: ${touch.description}` : ''}
${touch.response ? `- Ответ контакта: ${touch.response}` : ''}
${touch.followUpAt ? `- Напоминание: ${touch.followUpAt.toLocaleDateString('ru-RU')}` : ''}
- Создал: ${touch.createdBy.name}

Проанализируй этот лид и предложи:
1. Оценка качества лида и вероятности конвертации
2. Рекомендуемые следующие шаги (конкретные действия)
3. Оптимальное время и канал для следующего контакта
4. На что обратить внимание при общении

Будь конкретным и практичным. Дай actionable рекомендации.

ВАЖНО: Пиши простым текстом без markdown-разметки. Не используй символы #, *, **, _. Просто пиши обычным человеческим языком с переносами строк для разделения абзацев.
    `

    console.log('Sending touch analysis request to AI...')
    const analysis = await callOpenRouter([{ role: 'user', content: prompt }], 500)
    console.log('AI touch analysis received')

    // Save AI analysis to database
    await db.touch.update({
      where: { id: touchId },
      data: {
        aiAnalysis: analysis,
        analyzedAt: new Date(),
      },
    })
    console.log('AI analysis saved to database')

    return NextResponse.json({ analysis, savedToDb: true })
  } catch (error: any) {
    console.error('Touch analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze touch' },
      { status: 500 }
    )
  }
}
