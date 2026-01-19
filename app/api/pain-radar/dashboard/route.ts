import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import type { PainCategory } from '@prisma/client'

// GET /api/pain-radar/dashboard - Get dashboard metrics
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const period = searchParams.get('period') || '30d'

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate date range based on period
    const now = new Date()
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    // Get overview metrics
    const [totalPains, totalPosts, categoryGroups, avgSentimentResult] = await Promise.all([
      db.extractedPain.count({
        where: {
          workspaceId,
          createdAt: { gte: startDate },
        },
      }),
      db.socialPost.count({
        where: {
          keyword: { workspaceId },
          fetchedAt: { gte: startDate },
        },
      }),
      db.extractedPain.groupBy({
        by: ['category'],
        _count: true,
        where: {
          workspaceId,
          createdAt: { gte: startDate },
        },
        orderBy: {
          _count: {
            category: 'desc',
          },
        },
      }),
      db.extractedPain.aggregate({
        _avg: {
          sentiment: true,
        },
        where: {
          workspaceId,
          createdAt: { gte: startDate },
        },
      }),
    ])

    const topCategory = categoryGroups.length > 0 ? categoryGroups[0].category : null
    const avgSentiment = avgSentimentResult._avg.sentiment || 0

    // Get top pains
    const topPains = await db.extractedPain.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate },
      },
      orderBy: [
        { frequency: 'desc' },
        { severity: 'desc' },
      ],
      take: 10,
      include: {
        post: {
          select: {
            author: true,
            url: true,
            platform: true,
          },
        },
      },
    })

    // Calculate trends (daily aggregations)
    const trends: Array<{ date: string; count: number; sentiment: number }> = []
    const trendsData = await db.$queryRaw<Array<{
      date: Date
      count: bigint
      avg_sentiment: number
    }>>`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as count,
        AVG(sentiment)::float as avg_sentiment
      FROM extracted_pains
      WHERE workspace_id = ${workspaceId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    for (const row of trendsData) {
      trends.push({
        date: row.date.toISOString().split('T')[0],
        count: Number(row.count),
        sentiment: row.avg_sentiment || 0,
      })
    }

    // Calculate sentiment distribution
    const sentimentDistribution = {
      positive: 0,
      neutral: 0,
      negative: 0,
    }

    const pains = await db.extractedPain.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate },
      },
      select: {
        sentiment: true,
      },
    })

    for (const pain of pains) {
      if (pain.sentiment > 0.2) {
        sentimentDistribution.positive++
      } else if (pain.sentiment < -0.2) {
        sentimentDistribution.negative++
      } else {
        sentimentDistribution.neutral++
      }
    }

    return NextResponse.json({
      overview: {
        totalPains,
        totalPosts,
        topCategory,
        avgSentiment,
      },
      topPains: topPains.map(pain => ({
        id: pain.id,
        painText: pain.painText,
        frequency: pain.frequency,
        severity: pain.severity,
        trend: pain.trend,
        category: pain.category,
        sentiment: pain.sentiment,
        post: pain.post,
      })),
      trends,
      sentimentDistribution,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
