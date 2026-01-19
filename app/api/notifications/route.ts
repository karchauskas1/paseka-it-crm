import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { NotificationType } from '@prisma/client'

/**
 * GET /api/notifications
 * Получить уведомления текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const unreadOnly = searchParams.get('unread') === 'true'

    const where = {
      userId: user.id,
      ...(unreadOnly && { isRead: false }),
    }

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ])

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      hasMore: offset + notifications.length < total,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Создать уведомление (обычно вызывается из других API или сервисов)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, type, title, message, entityType, entityId } = await req.json()

    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title' },
        { status: 400 }
      )
    }

    // Проверяем что type валидный
    const validTypes: NotificationType[] = [
      'TASK_ASSIGNED',
      'TASK_DUE_SOON',
      'TASK_COMPLETED',
      'PROJECT_STATUS_CHANGED',
      'COMMENT_ADDED',
      'MENTION',
      'DEADLINE_APPROACHING',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid notification type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
