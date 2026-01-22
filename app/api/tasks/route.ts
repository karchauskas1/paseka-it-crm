import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logCreate } from '@/lib/activity-logger'
import { notifyTaskCreated } from '@/lib/telegram-group-notify'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const projectId = searchParams.get('projectId')
    const assigneeId = searchParams.get('assigneeId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const where: any = { workspaceId }
    if (projectId) where.projectId = projectId
    if (assigneeId) where.assigneeId = assigneeId

    const tasks = await db.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            subtasks: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspaceId,
      projectId,
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
    } = body

    if (!workspaceId || !title) {
      return NextResponse.json(
        { error: 'workspaceId and title are required' },
        { status: 400 }
      )
    }

    const task = await db.task.create({
      data: {
        workspaceId,
        projectId,
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: user.id,
      },
      include: {
        project: true,
        assignee: true,
      },
    })

    // Log activity
    await logCreate('task', task.id, { title, assigneeId }, user.id, { workspaceId, projectId })

    // Notify assignee
    if (assigneeId && assigneeId !== user.id) {
      const userName = user.name || user.email
      await db.notification.create({
        data: {
          userId: assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'Новая задача назначена',
          message: `${userName} назначил вам задачу "${title}"`,
          entityType: 'task',
          entityId: task.id,
        },
      })
    }

    // Notify team about new task
    const teamMembers = await db.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    })

    const userName = user.name || user.email
    await Promise.all(
      teamMembers
        .filter(m => m.userId !== user.id && m.userId !== assigneeId)
        .map(member =>
          db.notification.create({
            data: {
              userId: member.userId,
              type: 'PROJECT_STATUS_CHANGED',
              title: 'Создана новая задача',
              message: `${userName} создал задачу "${title}"`,
              entityType: 'task',
              entityId: task.id,
            },
          })
        )
    )

    // Send Telegram notification to assignee
    if (assigneeId && task.assignee?.telegramId) {
      const { notifyTaskAssigned } = await import('@/lib/telegram')
      await notifyTaskAssigned(
        task.assignee.telegramId,
        task.title,
        task.project?.name || 'Internal Task',
        task.dueDate || undefined
      )
    }

    // Send Telegram group notification
    notifyTaskCreated(
      workspaceId,
      task.id,
      task.title,
      userName || 'Пользователь',
      task.project?.name
    ).catch(err => console.error('Telegram group notify error:', err))

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
