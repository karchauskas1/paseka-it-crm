import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user with presence info
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        presence: {
          select: {
            isOnline: true,
            lastSeenAt: true,
          },
        },
        workspaceMembers: {
          where: {
            workspace: {
              members: {
                some: { userId: currentUser.id },
              },
            },
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if users share a workspace
    if (user.workspaceMembers.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.workspaceMembers[0]?.role || 'MEMBER',
      createdAt: user.createdAt.toISOString(),
      isOnline: user.presence?.isOnline || false,
      lastSeenAt: user.presence?.lastSeenAt?.toISOString() || null,
    })
  } catch (error) {
    console.error('User profile GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    )
  }
}
