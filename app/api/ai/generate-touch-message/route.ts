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
    const { touchId, contactName, industry, contactCompany, contactPosition, observations } = body

    if (!industry) {
      return NextResponse.json({ error: 'Сфера деятельности обязательна' }, { status: 400 })
    }

    const prompt = `# Роль
Ты — копирайтер B2B-аутрича для компании, которая делает автоматизацию бизнес-процессов (боты, CRM-интеграции, клиентские порталы, сайты, аналитика).

# Контекст
Данные о получателе:
- Имя: ${contactName || 'не указано'}
- Ниша/сфера: ${industry}
${contactCompany ? `- Компания: ${contactCompany}` : ''}
${contactPosition ? `- Роль: ${contactPosition}` : ''}
${observations ? `- Наблюдения о бизнесе: ${observations}` : ''}

# Задача
Написать первое сообщение (Telegram/WhatsApp), которое:

1. **Начинается с конкретной выгоды для получателя** — не "мы делаем ботов", а конкретный результат типа "сократить время на запись клиентов с 15 минут до 30 секунд" или "перестать терять заявки из-за долгого ответа"

2. **Показывает, что мы изучили их бизнес** — одна конкретная деталь про их нишу (не общие слова). Придумай правдоподобное наблюдение исходя из ниши.

3. **Содержит один чёткий оффер** в формате: "[Результат] за [срок] за счёт [механика]. Если не подойдёт — без обязательств"

4. **Заканчивается лёгким действием** — не "давай созвонимся", а "скину короткий разбор, посмотришь за 2 минуты?" или "могу показать как это работает у похожего бизнеса"

# Ограничения
- Длина: 4-6 коротких абзацев, читается за 30 секунд
- БЕЗ: "я эксперт", "у меня опыт", "мы профессионалы", "качественно и в срок"
- БЕЗ вопросов о бюджете, метриках, источниках трафика
- БЕЗ списков услуг через буллеты — один конкретный оффер
- Тон: уверенный, но не агрессивный. Равный к равному. Можно на "ты".
- Не продаём созвон — продаём интерес посмотреть материал
- Эмодзи: максимум 1-2, не в каждом абзаце

# Формат вывода
Только текст сообщения, без пояснений и комментариев.`

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
