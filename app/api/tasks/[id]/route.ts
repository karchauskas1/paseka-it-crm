import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { notifyTaskAssigned } from '@/lib/telegram'
import { logUpdate, logStatusChange, logDelete } from '@/lib/activity-logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        subtasks: true,
        comments: {
          include: {
            author: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await req.json()

    const existingTask = await db.task.findUnique({
      where: { id },
      include: { assignee: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = await db.task.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === 'COMPLETED' && !existingTask.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, telegramId: true },
        },
      },
    })

    // Log status change
    if (data.status && data.status !== existingTask.status) {
      await logStatusChange('task', id, existingTask.status, data.status, user.id, {
        workspaceId: existingTask.workspaceId,
        projectId: existingTask.projectId || undefined,
      })

      // Notify team about status change
      const teamMembers = await db.workspaceMember.findMany({
        where: { workspaceId: existingTask.workspaceId },
        select: { userId: true },
      })

      const userName = user.name || user.email
      const statusLabels: Record<string, string> = {
        TODO: 'К выполнению',
        IN_PROGRESS: 'В работе',
        IN_REVIEW: 'На проверке',
        COMPLETED: 'Завершена',
        BLOCKED: 'Заблокирована',
        CANCELLED: 'Отменена',
      }

      await Promise.all(
        teamMembers
          .filter(m => m.userId !== user.id)
          .map(member =>
            db.notification.create({
              data: {
                userId: member.userId,
                type: 'PROJECT_STATUS_CHANGED',
                title: 'Задача перемещена',
                message: `${userName} передвинул задачу "${task.title}": ${statusLabels[existingTask.status] || existingTask.status} → ${statusLabels[data.status] || data.status}`,
                entityType: 'task',
                entityId: task.id,
              },
            })
          )
      )
    }

    // Notify if assignee changed
    if (
      data.assigneeId &&
      data.assigneeId !== existingTask.assigneeId &&
      data.assigneeId !== user.id
    ) {
      const userName = user.name || user.email
      await db.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'Задача назначена',
          message: `${userName} назначил вам задачу "${task.title}"`,
          entityType: 'task',
          entityId: task.id,
        },
      })

      if (task.assignee?.telegramId) {
        await notifyTaskAssigned(
          task.assignee.telegramId,
          task.title,
          task.project?.name || 'Без проекта',
          task.dueDate || undefined
        )
      }
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get task data before deletion
    const existingTask = await db.task.findUnique({
      where: { id },
      select: { title: true, workspaceId: true, projectId: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Log deletion
    await logDelete('task', id, { title: existingTask.title }, user.id, {
      workspaceId: existingTask.workspaceId,
      projectId: existingTask.projectId || undefined,
    })

    await db.task.delete({
      where: { id },
    })

    // Notify team
    const teamMembers = await db.workspaceMember.findMany({
      where: { workspaceId: existingTask.workspaceId },
      select: { userId: true },
    })

    const userName = user.name || user.email
    await Promise.all(
      teamMembers
        .filter(m => m.userId !== user.id)
        .map(member =>
          db.notification.create({
            data: {
              userId: member.userId,
              type: 'PROJECT_STATUS_CHANGED',
              title: 'Задача удалена',
              message: `${userName} удалил задачу "${existingTask.title}"`,
              entityType: 'task',
              entityId: id,
            },
          })
        )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
