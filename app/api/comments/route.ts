import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { notifyCommentAdded } from '@/lib/telegram-group-notify'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, taskId, content } = await req.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!projectId && !taskId) {
      return NextResponse.json(
        { error: 'projectId or taskId is required' },
        { status: 400 }
      )
    }

    const comment = await db.comment.create({
      data: {
        content,
        authorId: user.id,
        projectId: projectId || null,
        taskId: taskId || null,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    })

    // Send Telegram group notification
    const userName = user.name || user.email || 'Пользователь'

    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true, name: true },
      })
      if (project) {
        notifyCommentAdded(
          project.workspaceId,
          'project',
          projectId,
          project.name,
          userName,
          content
        ).catch(err => console.error('Telegram group notify error:', err))
      }
    } else if (taskId) {
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { workspaceId: true, title: true },
      })
      if (task) {
        notifyCommentAdded(
          task.workspaceId,
          'task',
          taskId,
          task.title,
          userName,
          content
        ).catch(err => console.error('Telegram group notify error:', err))
      }
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
