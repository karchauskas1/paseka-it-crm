import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/activity
 * Получить активности с фильтрами
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    const workspaceId = workspaceMember.workspaceId

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const entityType = searchParams.get('entityType')
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: any = {
      OR: [
        { workspaceId },
        { project: { workspaceId } },
      ],
    }

    if (type) {
      where.type = type
    }

    if (entityType) {
      where.entityType = entityType
    }

    if (userId) {
      where.userId = userId
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    const [activities, total] = await Promise.all([
      db.activity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.activity.count({ where }),
    ])

    // Группировка по дням
    const groupedByDay: Record<string, typeof activities> = {}
    activities.forEach((activity) => {
      const date = new Date(activity.createdAt).toISOString().split('T')[0]
      if (!groupedByDay[date]) {
        groupedByDay[date] = []
      }
      groupedByDay[date].push(activity)
    })

    return NextResponse.json({
      activities,
      groupedByDay,
      total,
      hasMore: offset + activities.length < total,
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
