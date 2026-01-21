import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/chat/channels - Get all channels for user's workspace
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

    // Get or create general channel for workspace
    let channel = await db.chatChannel.findFirst({
      where: {
        workspaceId: membership.workspaceId,
        type: 'GENERAL',
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    })

    // Auto-create general channel if it doesn't exist
    if (!channel) {
      channel = await db.chatChannel.create({
        data: {
          workspaceId: membership.workspaceId,
          name: 'general',
          type: 'GENERAL',
          description: 'Общий чат команды',
        },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      })
    }

    // Get unread count for this channel
    const readStatus = await db.chatReadStatus.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId: user.id,
        },
      },
    })

    let unreadCount = 0
    if (readStatus?.lastReadMessageId) {
      // Count messages after last read
      const lastReadMessage = await db.chatMessage.findUnique({
        where: { id: readStatus.lastReadMessageId },
        select: { createdAt: true },
      })
      if (lastReadMessage) {
        unreadCount = await db.chatMessage.count({
          where: {
            channelId: channel.id,
            createdAt: { gt: lastReadMessage.createdAt },
          },
        })
      }
    } else {
      // Never read - all messages are unread
      unreadCount = channel._count.messages
    }

    return NextResponse.json({
      channels: [
        {
          ...channel,
          unreadCount,
        },
      ],
    })
  } catch (error) {
    console.error('Chat channels GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get channels' },
      { status: 500 }
    )
  }
}

// POST /api/chat/channels - Create a new channel (future use)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true, role: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Only admins/owners can create channels
    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, type = 'PROJECT' } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check if channel with this name already exists
    const existing = await db.chatChannel.findFirst({
      where: {
        workspaceId: membership.workspaceId,
        name: name.toLowerCase().trim(),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Channel with this name already exists' },
        { status: 409 }
      )
    }

    const channel = await db.chatChannel.create({
      data: {
        workspaceId: membership.workspaceId,
        name: name.toLowerCase().trim(),
        description,
        type: type as 'GENERAL' | 'PROJECT' | 'PRIVATE',
      },
    })

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    console.error('Chat channels POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    )
  }
}
