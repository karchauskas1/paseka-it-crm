import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/presence/workspace - Get presence status for all workspace members
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const membership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Get all workspace members with their presence
    const members = await db.workspaceMember.findMany({
      where: { workspaceId: membership.workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            presence: {
              select: {
                lastSeenAt: true,
                isOnline: true,
              },
            },
          },
        },
      },
    })

    // Mark users as offline if they haven't sent a heartbeat in 60 seconds
    await db.userPresence.updateMany({
      where: {
        workspaceId: membership.workspaceId,
        isOnline: true,
        lastSeenAt: {
          lt: new Date(Date.now() - 60000),
        },
      },
      data: {
        isOnline: false,
      },
    })

    // Format the response
    const presence = members.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: null, // User model doesn't have image field
      isOnline: member.user.presence?.isOnline ?? false,
      lastSeenAt: member.user.presence?.lastSeenAt ?? null,
      role: member.role,
    }))

    // Sort: online users first, then by name
    presence.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1
      }
      return (a.name || a.email || '').localeCompare(b.name || b.email || '')
    })

    return NextResponse.json({ members: presence })
  } catch (error) {
    console.error('Presence workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to get workspace presence' },
      { status: 500 }
    )
  }
}
