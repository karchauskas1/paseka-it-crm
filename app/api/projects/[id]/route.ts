import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  notifyProjectStatusChanged,
  notifyProjectDeleted,
} from '@/lib/telegram-group-notify'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true },
        },
        _count: {
          select: { tasks: true },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        milestones: {
          orderBy: {
            order: 'asc',
          },
        },
        architectureVersions: {
          orderBy: {
            version: 'desc',
          },
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        comments: {
          include: {
            author: {
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
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existingProject = await db.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        client: true,
      },
    })

    // Log activity for important changes
    if (body.status && body.status !== existingProject.status) {
      await db.activity.create({
        data: {
          projectId: project.id,
          type: 'STATUS_CHANGE',
          entityType: 'project',
          entityId: project.id,
          action: 'status_changed',
          oldValue: { status: existingProject.status },
          newValue: { status: body.status },
          userId: user.id,
        },
      })

      // Notify team members about status change
      const teamMembers = await db.workspaceMember.findMany({
        where: { workspaceId: existingProject.workspaceId },
        select: { userId: true },
      })

      const userName = user.name || user.email
      const statusLabels: Record<string, string> = {
        LEAD: 'Лид',
        QUALIFICATION: 'Квалификация',
        BRIEFING: 'Брифинг',
        IN_PROGRESS: 'В работе',
        ON_HOLD: 'На паузе',
        COMPLETED: 'Завершён',
        REJECTED: 'Отклонён',
        ARCHIVED: 'Архив',
      }

      await Promise.all(
        teamMembers
          .filter(m => m.userId !== user.id)
          .map(member =>
            db.notification.create({
              data: {
                userId: member.userId,
                type: 'PROJECT_STATUS_CHANGED',
                title: 'Изменён статус проекта',
                message: `${userName} изменил статус проекта "${project.name}": ${statusLabels[existingProject.status] || existingProject.status} → ${statusLabels[body.status] || body.status}`,
                entityType: 'project',
                entityId: project.id,
              },
            })
          )
      )

      // Send Telegram notification to user
      if (user.telegramId) {
        const { notifyProjectStatusChange } = await import('@/lib/telegram')
        await notifyProjectStatusChange(
          user.telegramId,
          project.name,
          existingProject.status,
          body.status
        )
      }

      // Send Telegram group notification
      notifyProjectStatusChanged(
        existingProject.workspaceId,
        project.id,
        project.name,
        userName || 'Пользователь',
        existingProject.status,
        body.status
      ).catch(err => console.error('Telegram group notify error:', err))
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get project data before deletion
    const existingProject = await db.project.findUnique({
      where: { id },
      select: { name: true, workspaceId: true },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await db.project.delete({
      where: { id },
    })

    // Notify team
    const teamMembers = await db.workspaceMember.findMany({
      where: { workspaceId: existingProject.workspaceId },
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
              title: 'Проект удалён',
              message: `${userName} удалил проект "${existingProject.name}"`,
              entityType: 'project',
              entityId: id,
            },
          })
        )
    )

    // Send Telegram group notification
    notifyProjectDeleted(
      existingProject.workspaceId,
      existingProject.name,
      userName || 'Пользователь'
    ).catch(err => console.error('Telegram group notify error:', err))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
