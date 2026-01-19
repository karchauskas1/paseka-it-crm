import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/invites/[token]
 * Проверить инвайт по токену
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    const invite = await db.invite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { name: true },
        },
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

    return NextResponse.json({
      valid: true,
      workspace: invite.workspace,
      role: invite.role,
      email: invite.email,
      invitedBy: invite.createdBy?.name,
      expiresAt: invite.expiresAt,
    })
  } catch (error) {
    console.error('Error checking invite:', error)
    return NextResponse.json({ error: 'Failed to check invite' }, { status: 500 })
  }
}

/**
 * DELETE /api/invites/[token]
 * Отменить инвайт
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    const invite = await db.invite.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    await db.invite.delete({
      where: { token },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invite:', error)
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }
}
