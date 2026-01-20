import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

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
    const platform = searchParams.get('platform')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const where: any = {
      keyword: { workspaceId },
      ...(keywordId && { keywordId }),
      ...(isAnalyzed !== null && { isAnalyzed: isAnalyzed === 'true' }),
      ...(platform && { platform }),
    }

    const [posts, total] = await Promise.all([
      db.socialPost.findMany({
        where,
        include: {
          keyword: { select: { keyword: true } },
          _count: { select: { pains: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.socialPost.count({ where }),
    ])

    return NextResponse.json({ posts, total })
  } catch (error: any) {
    console.error('Posts GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
