import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { botToken, chatId } = await req.json()

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'botToken and chatId are required' },
        { status: 400 }
      )
    }

    const message = `🧪 Тестовое сообщение от PASEKA IT CRM

✅ Интеграция работает корректно!

Отправлено пользователем: ${user.name}
Время: ${new Date().toLocaleString('ru-RU')}`

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.description || 'Telegram API error')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error testing Telegram:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test message' },
      { status: 500 }
    )
  }
}
