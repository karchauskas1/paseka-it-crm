import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { linkTelegramId, unlinkTelegramId } from '@/lib/telegram-bot'
import { db } from '@/lib/db'

// Link Telegram ID
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { telegramId, telegramName } = body

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 })
    }

    // Check if this Telegram ID is already linked to another user
    const existingUser = await db.user.findUnique({
      where: { telegramId },
    })

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { error: 'Этот Telegram ID уже привязан к другому аккаунту' },
        { status: 400 }
      )
    }

    // Link Telegram ID
    const success = await linkTelegramId(user.id, telegramId, telegramName || 'Unknown')

    if (!success) {
      return NextResponse.json(
        { error: 'Не удалось привязать Telegram' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Link Telegram error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Unlink Telegram ID
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = await unlinkTelegramId(user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Не удалось отвязать Telegram' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unlink Telegram error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
