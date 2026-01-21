import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/search/users - Search for users for @ mentions
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25)

    // Get user's workspace
    const membership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Search workspace members
    const members = await db.workspaceMember.findMany({
      where: {
        workspaceId: membership.workspaceId,
        user: query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            presence: {
              select: {
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
      },
    })

    // Format results
    const users = members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: null, // User model doesn't have image field
      role: member.role,
      isOnline: member.user.presence?.isOnline ?? false,
      lastSeenAt: member.user.presence?.lastSeenAt ?? null,
    }))

    // Sort: online users first, then alphabetically
    users.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1
      return (a.name || a.email || '').localeCompare(b.name || b.email || '')
    })

    return NextResponse.json({
      users,
      query,
    })
  } catch (error) {
    console.error('Search users error:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}
