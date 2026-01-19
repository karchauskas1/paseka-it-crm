import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/notifications/count
 * Получить количество непрочитанных уведомлений
 * Используется для polling badge в колокольчике
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification count' },
      { status: 500 }
    )
  }
}
