import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingTask = await db.task.findUnique({
      where: { id },
      select: { id: true, isArchived: true, status: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.isArchived) {
      return NextResponse.json({ error: 'Task is already archived' }, { status: 400 })
    }

    const task = await db.task.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error archiving task:', error)
    return NextResponse.json(
      { error: 'Failed to archive task' },
      { status: 500 }
    )
  }
}

// Restore from archive
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

    const existingTask = await db.task.findUnique({
      where: { id },
      select: { id: true, isArchived: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!existingTask.isArchived) {
      return NextResponse.json({ error: 'Task is not archived' }, { status: 400 })
    }

    const task = await db.task.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error restoring task:', error)
    return NextResponse.json(
      { error: 'Failed to restore task' },
      { status: 500 }
    )
  }
}
