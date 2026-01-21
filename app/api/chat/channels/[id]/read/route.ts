import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/chat/channels/[id]/read - Mark channel as read
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: channelId } = await params

    // Verify channel exists and user has access
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

    // Get the last message ID
    const body = await req.json().catch(() => ({}))
    let { messageId } = body

    // If no messageId provided, use the latest message
    if (!messageId) {
      const latestMessage = await db.chatMessage.findFirst({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      messageId = latestMessage?.id
    }

    if (!messageId) {
      // No messages in channel, nothing to mark as read
      return NextResponse.json({ success: true, unreadCount: 0 })
    }

    // Update read status
    await db.chatReadStatus.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId: user.id,
        },
      },
      update: {
        lastReadMessageId: messageId,
        lastReadAt: new Date(),
      },
      create: {
        channelId,
        userId: user.id,
        lastReadMessageId: messageId,
        lastReadAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, unreadCount: 0 })
  } catch (error) {
    console.error('Chat read POST error:', error)
    return NextResponse.json(
      { error: 'Failed to mark as read' },
      { status: 500 }
    )
  }
}
