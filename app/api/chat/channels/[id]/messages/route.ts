import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/chat/channels/[id]/messages - Get messages with cursor pagination
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: channelId } = await params
    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor') // message ID to paginate from
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const since = searchParams.get('since') // ISO timestamp for polling new messages

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

    // Build query
    const where: any = { channelId }

    if (since) {
      // For polling: get messages after timestamp
      where.createdAt = { gt: new Date(since) }
    }

    // Get messages
    const messages = await db.chatMessage.findMany({
      where,
      take: since ? 100 : limit + 1, // Get one extra to check if there's more
      ...(cursor && !since
        ? {
            cursor: { id: cursor },
            skip: 1, // Skip the cursor itself
          }
        : {}),
      orderBy: { createdAt: since ? 'asc' : 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Check if there are more messages
    let hasMore = false
    let nextCursor: string | null = null

    if (!since && messages.length > limit) {
      hasMore = true
      messages.pop() // Remove the extra message
      nextCursor = messages[messages.length - 1]?.id || null
    }

    // Reverse for normal order (newest last) when paginating
    const orderedMessages = since ? messages : messages.reverse()

    return NextResponse.json({
      messages: orderedMessages,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    console.error('Chat messages GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    )
  }
}

// POST /api/chat/channels/[id]/messages - Send a message
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: channelId } = await params

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

    const body = await req.json()
    const { content, mentions = [], entityLinks = [], replyToId } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Message too long (max 10000 characters)' },
        { status: 400 }
      )
    }

    // Verify replyToId if provided
    if (replyToId) {
      const replyMessage = await db.chatMessage.findUnique({
        where: { id: replyToId },
        select: { channelId: true },
      })
      if (!replyMessage || replyMessage.channelId !== channelId) {
        return NextResponse.json(
          { error: 'Reply message not found in this channel' },
          { status: 400 }
        )
      }
    }

    // Create the message
    const message = await db.chatMessage.create({
      data: {
        channelId,
        authorId: user.id,
        content: content.trim(),
        mentions,
        entityLinks,
        replyToId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Update read status for the sender (they've seen their own message)
    await db.chatReadStatus.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId: user.id,
        },
      },
      update: {
        lastReadMessageId: message.id,
        lastReadAt: new Date(),
      },
      create: {
        channelId,
        userId: user.id,
        lastReadMessageId: message.id,
        lastReadAt: new Date(),
      },
    })

    // Create notifications for mentioned users
    if (Array.isArray(mentions) && mentions.length > 0) {
      const mentionedUserIds = mentions
        .filter((m: any) => m.type === 'user' && m.id !== user.id)
        .map((m: any) => m.id)

      if (mentionedUserIds.length > 0) {
        // Verify mentioned users are in the workspace
        const validMembers = await db.workspaceMember.findMany({
          where: {
            workspaceId: channel.workspaceId,
            userId: { in: mentionedUserIds },
          },
          select: { userId: true },
        })

        const validUserIds = validMembers.map((m) => m.userId)

        // Create notifications
        await db.notification.createMany({
          data: validUserIds.map((userId) => ({
            userId,
            type: 'CHAT_MENTION',
            title: `${user.name || user.email} упомянул вас в чате`,
            message: content.substring(0, 200),
            data: {
              channelId,
              messageId: message.id,
              authorId: user.id,
              authorName: user.name || user.email,
            },
          })),
        })
      }
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Chat messages POST error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
