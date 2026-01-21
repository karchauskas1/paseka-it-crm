import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const defaultSettings = {
  theme: 'system',
  navLayout: 'top',
  dateFormat: 'DD.MM.YYYY',
  compactMode: false,
  showNotifications: true,
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { uiSettings: true, language: true },
    })

    const uiSettings = (dbUser?.uiSettings as object) || {}

    return NextResponse.json({
      ...defaultSettings,
      ...uiSettings,
      language: dbUser?.language || 'ru',
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { theme, navLayout, dateFormat, compactMode, showNotifications, language } = body

    // Валидация
    if (theme && !['light', 'dark', 'system'].includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
    }
    if (navLayout && !['top', 'sidebar'].includes(navLayout)) {
      return NextResponse.json({ error: 'Invalid navLayout' }, { status: 400 })
    }
    if (language && !['ru', 'en'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }

    // Получаем текущие настройки
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { uiSettings: true, language: true },
    })

    const currentSettings = (currentUser?.uiSettings as object) || {}

    // Мержим с новыми
    const newSettings = {
      ...currentSettings,
      ...(theme !== undefined && { theme }),
      ...(navLayout !== undefined && { navLayout }),
      ...(dateFormat !== undefined && { dateFormat }),
      ...(compactMode !== undefined && { compactMode }),
      ...(showNotifications !== undefined && { showNotifications }),
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        uiSettings: newSettings,
        ...(language !== undefined && { language }),
      },
    })

    return NextResponse.json({
      ...defaultSettings,
      ...newSettings,
      language: language || currentUser?.language || 'ru',
    })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
