import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update users
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { name, role } = await req.json()

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Check if user exists and belongs to same workspace
    const targetMembership = await db.workspaceMember.findFirst({
      where: {
        userId: id,
        workspaceId: workspace.id,
      },
      include: { user: true },
    })

    if (!targetMembership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent removing the last admin
    if (targetMembership.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await db.workspaceMember.count({
        where: {
          workspaceId: workspace.id,
          role: 'ADMIN',
        },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin' },
          { status: 400 }
        )
      }
    }

    // Update user name if provided
    if (name !== undefined) {
      await db.user.update({
        where: { id },
        data: { name },
      })
    }

    // Update workspace role if provided
    if (role !== undefined) {
      await db.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: id,
          },
        },
        data: { role },
      })
    }

    const updatedUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
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

    // Only admins can delete users
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Can't delete yourself
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Check if user exists and belongs to same workspace
    const targetMembership = await db.workspaceMember.findFirst({
      where: {
        userId: id,
        workspaceId: workspace.id,
      },
    })

    if (!targetMembership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting the last admin
    if (targetMembership.role === 'ADMIN') {
      const adminCount = await db.workspaceMember.count({
        where: {
          workspaceId: workspace.id,
          role: 'ADMIN',
        },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin' },
          { status: 400 }
        )
      }
    }

    await db.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
