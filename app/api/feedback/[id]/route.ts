import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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

    // Check if feedback belongs to user's workspace
    const existingFeedback = await db.feedback.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
    })

    if (!existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    const { status, priority } = await req.json()

    const feedback = await db.feedback.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
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

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error updating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
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

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    // Check if feedback belongs to user's workspace and user is ADMIN or OWNER
    const existingFeedback = await db.feedback.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
    })

    if (!existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Only ADMIN or OWNER can delete feedback
    if (workspaceMember.role !== 'ADMIN' && workspaceMember.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only admins can delete feedback' },
        { status: 403 }
      )
    }

    await db.feedback.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feedback:', error)
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    )
  }
}
