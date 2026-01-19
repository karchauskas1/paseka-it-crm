import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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

    // Send notification to assignee
    if (assigneeId && task.assignee?.telegramId) {
      const { notifyTaskAssigned } = await import('@/lib/telegram')
      await notifyTaskAssigned(
        task.assignee.telegramId,
        task.title,
        task.project?.name || 'Internal Task',
        task.dueDate || undefined
      )
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
