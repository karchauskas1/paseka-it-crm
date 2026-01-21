import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/chat/unread - Get total unread message count for all channels
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

    // Get all channels in workspace
    const channels = await db.chatChannel.findMany({
      where: { workspaceId: membership.workspaceId },
      select: { id: true },
    })

    if (channels.length === 0) {
      return NextResponse.json({ totalUnread: 0, channels: {} })
    }

    // Get read status for all channels
    const readStatuses = await db.chatReadStatus.findMany({
      where: {
        userId: user.id,
        channelId: { in: channels.map((c) => c.id) },
      },
    })

    const readStatusMap = new Map(
      readStatuses.map((rs) => [rs.channelId, rs])
    )

    let totalUnread = 0
    const channelUnreads: Record<string, number> = {}

    // Calculate unread count for each channel
    for (const channel of channels) {
      const readStatus = readStatusMap.get(channel.id)

      if (readStatus?.lastReadMessageId) {
        // Get the timestamp of the last read message
        const lastReadMessage = await db.chatMessage.findUnique({
          where: { id: readStatus.lastReadMessageId },
          select: { createdAt: true },
        })

        if (lastReadMessage) {
          const unreadCount = await db.chatMessage.count({
            where: {
              channelId: channel.id,
              createdAt: { gt: lastReadMessage.createdAt },
            },
          })
          channelUnreads[channel.id] = unreadCount
          totalUnread += unreadCount
        }
      } else {
        // Never read this channel - all messages are unread
        const totalMessages = await db.chatMessage.count({
          where: { channelId: channel.id },
        })
        channelUnreads[channel.id] = totalMessages
        totalUnread += totalMessages
      }
    }

    return NextResponse.json({
      totalUnread,
      channels: channelUnreads,
    })
  } catch (error) {
    console.error('Chat unread GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500 }
    )
  }
}
