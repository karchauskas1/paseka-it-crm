import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { notifyFeedbackSubmitted } from '@/lib/telegram-group-notify'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const adminView = searchParams.get('adminView') === 'true'

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Проверяем роль пользователя
    const workspaceMember = await db.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isAdmin = ['OWNER', 'ADMIN'].includes(workspaceMember.role)

    // Админы видят всё, пользователи только свои
    const whereClause = adminView && isAdmin
      ? { workspaceId }
      : { workspaceId, createdById: user.id }

    const feedback = await db.feedback.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ feedback, isAdmin })
  } catch (error) {
    console.error('Get feedback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workspaceId, type, title, description, priority, screenshot } = body

    if (!workspaceId || !type || !title || !description) {
      return NextResponse.json(
        { error: 'workspaceId, type, title, and description are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['BUG', 'FEATURE', 'IMPROVEMENT'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be BUG, FEATURE, or IMPROVEMENT' },
        { status: 400 }
      )
    }

    const feedback = await db.feedback.create({
      data: {
        workspaceId,
        type,
        title,
        description,
        screenshot: screenshot || null,
        priority: priority || null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Notify admins about new feedback
    const admins = await db.workspaceMember.findMany({
      where: {
        workspaceId,
        role: { in: ['OWNER', 'ADMIN'] },
        userId: { not: user.id }, // Don't notify the creator
      },
      select: { userId: true },
    })

    const typeLabels: Record<string, string> = {
      BUG: 'баг-репорт',
      FEATURE: 'предложение функции',
      IMPROVEMENT: 'предложение улучшения',
    }

    const userName = user.name || user.email || 'Пользователь'

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.userId,
          type: 'NEW_FEEDBACK',
          title: 'Новая обратная связь',
          message: `${userName} отправил ${typeLabels[type] || 'сообщение'}: "${title}"`,
          entityType: 'feedback',
          entityId: feedback.id,
        })),
      })
    }

    // Send Telegram group notification
    notifyFeedbackSubmitted(
      workspaceId,
      feedback.id,
      type,
      title,
      userName
    ).catch(err => console.error('Telegram group notify error:', err))

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Create feedback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
