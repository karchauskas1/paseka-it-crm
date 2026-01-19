import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * POST /api/invites/[token]/accept
 * Принять инвайт и присоединиться к workspace
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invite = await db.invite.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Проверка, использован ли инвайт
    if (invite.usedAt) {
      return NextResponse.json({ error: 'Invite already used' }, { status: 410 })
    }

    // Проверка срока действия
    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }

    // Проверка email (если указан)
    if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite is for a different email address' },
        { status: 403 }
      )
    }

    // Проверка, не состоит ли уже в этом workspace
    const existingMembership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId: user.id,
          workspaceId: invite.workspaceId,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 409 }
      )
    }

    // Добавление пользователя в workspace
    await db.$transaction([
      // Создаем membership
      db.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      }),
      // Помечаем инвайт использованным
      db.invite.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      // Логируем активность
      db.activity.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: user.id,
          type: 'CREATE',
          action: 'присоединился к workspace', entityType: 'workspace', entityId: invite.workspaceId,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      workspace: {
        id: invite.workspace.id,
        name: invite.workspace.name,
      },
      role: invite.role,
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
