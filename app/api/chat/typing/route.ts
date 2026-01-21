import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// In-memory store for typing status (in production, use Redis)
const typingUsers = new Map<string, Map<string, { userId: string; userName: string; expiresAt: number }>>()

// Cleanup expired typing statuses
function cleanupExpired() {
  const now = Date.now()
  for (const [channelId, users] of typingUsers) {
    for (const [userId, data] of users) {
      if (data.expiresAt < now) {
        users.delete(userId)
      }
    }
    if (users.size === 0) {
      typingUsers.delete(channelId)
    }
  }
}

// POST /api/chat/typing - Set typing status
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { channelId, isTyping } = body

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
    }

    // Verify user has access to this channel
    const channel = await db.chatChannel.findUnique({
      where: { id: channelId },
      select: { workspaceId: true },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const membership = await db.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: channel.workspaceId,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update typing status
    if (!typingUsers.has(channelId)) {
      typingUsers.set(channelId, new Map())
    }

    const channelTyping = typingUsers.get(channelId)!

    if (isTyping) {
      channelTyping.set(user.id, {
        userId: user.id,
        userName: user.name || user.email || 'Пользователь',
        expiresAt: Date.now() + 5000, // Expires in 5 seconds
      })
    } else {
      channelTyping.delete(user.id)
    }

    // Cleanup expired
    cleanupExpired()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Typing POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update typing status' },
      { status: 500 }
    )
  }
}

// GET /api/chat/typing?channelId=xxx - Get typing users
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
    }

    // Cleanup expired
    cleanupExpired()

    // Get typing users for channel (excluding current user)
    const channelTyping = typingUsers.get(channelId)
    const typingList = channelTyping
      ? Array.from(channelTyping.values())
          .filter((t) => t.userId !== user.id)
          .map((t) => ({ userId: t.userId, name: t.userName }))
      : []

    return NextResponse.json({ typing: typingList })
  } catch (error) {
    console.error('Typing GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get typing status' },
      { status: 500 }
    )
  }
}
