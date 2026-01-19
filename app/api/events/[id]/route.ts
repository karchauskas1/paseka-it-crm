import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * PATCH /api/events/[id]
 * Обновить событие
 */
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

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    // Check if event belongs to user's workspace
    const existingEvent = await db.event.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      type,
      projectId,
      taskId,
      clientId,
    } = await req.json()

    const event = await db.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(allDay !== undefined && { allDay }),
        ...(type !== undefined && { type }),
        ...(projectId !== undefined && { projectId }),
        ...(taskId !== undefined && { taskId }),
        ...(clientId !== undefined && { clientId }),
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[id]
 * Удалить событие
 */
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

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    // Check if event belongs to user's workspace
    const existingEvent = await db.event.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    await db.event.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
