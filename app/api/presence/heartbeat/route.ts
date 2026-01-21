import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/presence/heartbeat - Update user's online status
export async function POST() {
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

    // Update or create presence record
    const presence = await db.userPresence.upsert({
      where: { userId: user.id },
      update: {
        lastSeenAt: new Date(),
        isOnline: true,
        workspaceId: membership.workspaceId,
      },
      create: {
        userId: user.id,
        workspaceId: membership.workspaceId,
        lastSeenAt: new Date(),
        isOnline: true,
      },
    })

    // Mark users as offline if they haven't sent a heartbeat in 60 seconds
    await db.userPresence.updateMany({
      where: {
        workspaceId: membership.workspaceId,
        isOnline: true,
        lastSeenAt: {
          lt: new Date(Date.now() - 60000), // 60 seconds
        },
      },
      data: {
        isOnline: false,
      },
    })

    return NextResponse.json({
      success: true,
      lastSeenAt: presence.lastSeenAt,
    })
  } catch (error) {
    console.error('Presence heartbeat error:', error)
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    )
  }
}
