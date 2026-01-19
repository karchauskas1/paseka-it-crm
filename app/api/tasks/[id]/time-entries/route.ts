import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * GET /api/tasks/[id]/time-entries
 * Получить записи времени для задачи
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verify task belongs to workspace
    const task = await db.task.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const timeEntries = await db.timeEntry.findMany({
      where: { taskId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    // Calculate total time
    const totalSeconds = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)

    return NextResponse.json({
      entries: timeEntries,
      totalSeconds,
    })
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[id]/time-entries
 * Создать запись времени
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verify task belongs to workspace
    const task = await db.task.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const { duration, notes, startedAt, endedAt } = await req.json()

    if (!duration || duration <= 0) {
      return NextResponse.json(
        { error: 'Duration is required and must be positive' },
        { status: 400 }
      )
    }

    const now = new Date()
    const timeEntry = await db.timeEntry.create({
      data: {
        taskId: id,
        userId: user.id,
        duration,
        notes,
        startedAt: startedAt ? new Date(startedAt) : new Date(now.getTime() - duration * 1000),
        endedAt: endedAt ? new Date(endedAt) : now,
      },
    })

    return NextResponse.json(timeEntry, { status: 201 })
  } catch (error) {
    console.error('Error creating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to create time entry' },
      { status: 500 }
    )
  }
}
