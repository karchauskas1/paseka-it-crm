import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/chat/stream - Server-Sent Events for real-time updates
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get user's workspace
  const membership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  })

  if (!membership) {
    return new Response('No workspace found', { status: 404 })
  }

  const workspaceId = membership.workspaceId

  // Get or create the general channel
  let channel = await db.chatChannel.findFirst({
    where: {
      workspaceId,
      type: 'GENERAL',
    },
  })

  if (!channel) {
    channel = await db.chatChannel.create({
      data: {
        workspaceId,
        name: 'general',
        type: 'GENERAL',
        description: 'Общий чат команды',
      },
    })
  }

  const channelId = channel.id
  let lastMessageTime = new Date()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ channelId })}\n\n`)
      )

      // Poll for new messages every 3 seconds
      const interval = setInterval(async () => {
        try {
          // Check for new messages
          const newMessages = await db.chatMessage.findMany({
            where: {
              channelId,
              createdAt: { gt: lastMessageTime },
            },
            orderBy: { createdAt: 'asc' },
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

          if (newMessages.length > 0) {
            lastMessageTime = newMessages[newMessages.length - 1].createdAt

            for (const message of newMessages) {
              controller.enqueue(
                encoder.encode(
                  `event: new_message\ndata: ${JSON.stringify(message)}\n\n`
                )
              )
            }
          }

          // Get online users for presence updates
          const onlineUsers = await db.userPresence.findMany({
            where: {
              workspaceId,
              isOnline: true,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })

          controller.enqueue(
            encoder.encode(
              `event: presence\ndata: ${JSON.stringify({
                online: onlineUsers.map((p) => ({
                  userId: p.userId,
                  name: p.user.name,
                  lastSeenAt: p.lastSeenAt,
                })),
              })}\n\n`
            )
          )

          // Send heartbeat to keep connection alive
          controller.enqueue(encoder.encode(`:heartbeat\n\n`))
        } catch (error) {
          console.error('SSE poll error:', error)
        }
      }, 3000)

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
