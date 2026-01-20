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
    const category = searchParams.get('category')
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
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
      workspaceId,
      ...(category && { category }),
      ...(severity && { severity }),
      ...(search && {
        OR: [
          { painText: { contains: search, mode: 'insensitive' } },
          { keywords: { has: search } },
        ],
      }),
    }

    const orderBy: any = {}
    if (sortBy === 'frequency') {
      orderBy.frequency = 'desc'
    } else if (sortBy === 'trend') {
      orderBy.trend = 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [pains, total, aggregations] = await Promise.all([
      db.extractedPain.findMany({
        where,
        include: {
          post: {
            select: {
              url: true,
              author: true,
              platform: true,
              publishedAt: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      db.extractedPain.count({ where }),
      db.extractedPain.groupBy({
        by: ['category', 'severity'],
        where: { workspaceId },
        _count: true,
      }),
    ])

    const byCategory: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}

    aggregations.forEach(agg => {
      byCategory[agg.category] = (byCategory[agg.category] || 0) + agg._count
      bySeverity[agg.severity] = (bySeverity[agg.severity] || 0) + agg._count
    })

    return NextResponse.json({
      pains,
      total,
      aggregations: {
        byCategory,
        bySeverity,
      },
    })
  } catch (error: any) {
    console.error('Pains GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
