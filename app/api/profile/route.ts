import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/profile
 * Получить профиль текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        telegramId: true,
        notificationSettings: true,
        language: true,
        createdAt: true,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 * Обновить профиль текущего пользователя
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, telegramId, language, notificationSettings } = body

    const updateData: any = {}

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (telegramId !== undefined) {
      updateData.telegramId = telegramId || null
    }

    if (language !== undefined) {
      if (!['ru', 'en'].includes(language)) {
        return NextResponse.json(
          { error: 'Invalid language' },
          { status: 400 }
        )
      }
      updateData.language = language
    }

    if (notificationSettings !== undefined) {
      updateData.notificationSettings = notificationSettings
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        telegramId: true,
        notificationSettings: true,
        language: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
