import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'anthropic/claude-3-haiku'

async function callOpenRouter(messages: Array<{ role: string; content: string }>, maxTokens: number = 500) {
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { touchId, contactName, industry, contactCompany, contactPosition } = body

    if (!industry) {
      return NextResponse.json({ error: 'Сфера деятельности обязательна' }, { status: 400 })
    }

    const prompt = `
Ты - дружелюбный и профессиональный менеджер по продажам IT-услуг. Тебе нужно написать первое сообщение для холодного касания.

Информация о контакте:
- Имя: ${contactName || 'не указано'}
- Сфера деятельности: ${industry}
${contactCompany ? `- Компания: ${contactCompany}` : ''}
${contactPosition ? `- Должность: ${contactPosition}` : ''}

Напиши короткое, дружелюбное сообщение для первого касания. Сообщение должно:

1. Начинаться с неформального приветствия (йоу, привет, хей)
2. Кратко упомянуть сферу деятельности контакта
3. Предложить 4-5 конкретных услуг/решений которые актуальны для этой сферы (автоматизация, боты, сайты, CRM, аналитика и т.д.)
4. Сказать что с радостью обсудим что актуально именно для них
5. Быть коротким (не более 100 слов)
6. Звучать естественно, как сообщение в мессенджере, не как официальное письмо

Пример структуры:
"Йоу, [имя]! 👋

Вижу ты в [сфера] — это круто!

Мы сейчас активно работаем с такими проектами и можем помочь с:
• [услуга 1]
• [услуга 2]
• [услуга 3]
• [услуга 4]
• [услуга 5]

Если что-то из этого актуально — с удовольствием обсудим. А если есть другие задачи которые хочется закрыть — тоже расскажи, может чем поможем 🤝"

ВАЖНО:
- Пиши простым текстом, без markdown
- Используй эмодзи умеренно (2-3 штуки)
- Будь конкретным в предложениях под сферу
- Не используй формальные обращения типа "Уважаемый"
`

    console.log('Generating touch message...')
    const message = await callOpenRouter([{ role: 'user', content: prompt }], 400)
    console.log('Touch message generated')

    // Save generated message to database if touchId provided
    if (touchId) {
      await db.touch.update({
        where: { id: touchId },
        data: {
          generatedMessage: message,
        },
      })
      console.log('Generated message saved to database')
    }

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Generate touch message error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate message' },
      { status: 500 }
    )
  }
}
