import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * POST /api/admin/transfer-ownership
 * Передать права OWNER другому пользователю
 * Только OWNER может выполнить эту операцию
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Только OWNER может передавать права
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only OWNER can transfer ownership' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { newOwnerId } = body

    if (!newOwnerId) {
      return NextResponse.json(
        { error: 'newOwnerId is required' },
        { status: 400 }
      )
    }

    // Проверяем, что новый владелец - участник workspace
    const newOwnerMembership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId: newOwnerId,
          workspaceId: workspace.id,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!newOwnerMembership) {
      return NextResponse.json(
        { error: 'User is not a member of this workspace' },
        { status: 400 }
      )
    }

    // Нельзя передать права самому себе
    if (newOwnerId === user.id) {
      return NextResponse.json(
        { error: 'Cannot transfer ownership to yourself' },
        { status: 400 }
      )
    }

    // Передача прав в транзакции
    await db.$transaction([
      // Новый владелец становится OWNER
      db.workspaceMember.update({
        where: {
          workspaceId_userId: {
            userId: newOwnerId,
            workspaceId: workspace.id,
          },
        },
        data: { role: 'OWNER' },
      }),
      // Старый владелец становится ADMIN
      db.workspaceMember.update({
        where: {
          workspaceId_userId: {
            userId: user.id,
            workspaceId: workspace.id,
          },
        },
        data: { role: 'ADMIN' },
      }),
      // Логируем активность
      db.activity.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          type: 'UPDATE',
          entityType: 'workspace',
          entityId: workspace.id,
          action: `передал права владельца пользователю ${newOwnerMembership.user.name}`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Права владельца переданы пользователю ${newOwnerMembership.user.name}`,
      newOwner: {
        id: newOwnerMembership.user.id,
        name: newOwnerMembership.user.name,
        email: newOwnerMembership.user.email,
      },
    })
  } catch (error) {
    console.error('Error transferring ownership:', error)
    return NextResponse.json(
      { error: 'Failed to transfer ownership' },
      { status: 500 }
    )
  }
}
