import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'

// GET /api/pain-radar/posts - Get list of posts with filters
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const keywordId = searchParams.get('keywordId')
    const isAnalyzed = searchParams.get('isAnalyzed')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build where clause
    const where: any = {
      keyword: { workspaceId },
    }

    if (keywordId) {
      where.keywordId = keywordId
    }

    if (isAnalyzed !== null) {
      where.isAnalyzed = isAnalyzed === 'true'
    }

    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      db.socialPost.findMany({
        where,
        include: {
          keyword: {
            select: {
              id: true,
              keyword: true,
              category: true,
            },
          },
          _count: {
            select: {
              pains: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      db.socialPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
