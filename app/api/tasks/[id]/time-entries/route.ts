import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Get time entries for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params

    const timeEntries = await db.timeEntry.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    return NextResponse.json({ timeEntries })
  } catch (error) {
    console.error('Get time entries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Start or stop time tracking
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params
    const body = await req.json()
    const { action, notes } = body

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "stop"' },
        { status: 400 }
      )
    }

    if (action === 'start') {
      const activeEntry = await db.timeEntry.findFirst({
        where: {
          taskId,
          userId: user.id,
          endedAt: null,
        },
      })

      if (activeEntry) {
        return NextResponse.json(
          { error: 'Timer already running for this task' },
          { status: 400 }
        )
      }

      const timeEntry = await db.timeEntry.create({
        data: {
          taskId,
          userId: user.id,
          startedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({ timeEntry })
    } else {
      const activeEntry = await db.timeEntry.findFirst({
        where: {
          taskId,
          userId: user.id,
          endedAt: null,
        },
      })

      if (!activeEntry) {
        return NextResponse.json(
          { error: 'No active timer for this task' },
          { status: 400 }
        )
      }

      const endedAt = new Date()
      const duration = Math.floor(
        (endedAt.getTime() - activeEntry.startedAt.getTime()) / 1000
      )

      const timeEntry = await db.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          endedAt,
          duration,
          notes: notes || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({ timeEntry })
    }
  } catch (error) {
    console.error('Time tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
