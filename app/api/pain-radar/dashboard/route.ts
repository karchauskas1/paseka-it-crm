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
    const period = searchParams.get('period') || '30d'

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    const [totalPains, totalPosts, topPains, categoryStats, recentScans] =
      await Promise.all([
        db.extractedPain.count({
          where: { workspaceId, createdAt: { gte: dateFrom } },
        }),
        db.socialPost.count({
          where: { keyword: { workspaceId }, fetchedAt: { gte: dateFrom } },
        }),
        db.extractedPain.findMany({
          where: { workspaceId, createdAt: { gte: dateFrom } },
          include: {
            post: {
              select: {
                url: true,
                platform: true,
                author: true,
              },
            },
          },
          orderBy: { frequency: 'desc' },
          take: 10,
        }),
        db.extractedPain.groupBy({
          by: ['category'],
          where: { workspaceId, createdAt: { gte: dateFrom } },
          _count: true,
          _avg: { sentiment: true },
        }),
        db.painScan.findMany({
          where: { workspaceId, createdAt: { gte: dateFrom } },
          include: {
            keyword: { select: { keyword: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ])

    const topCategory =
      categoryStats.length > 0
        ? categoryStats.reduce((max, curr) =>
            curr._count > max._count ? curr : max
          ).category
        : null

    const avgSentiment =
      categoryStats.length > 0
        ? categoryStats.reduce((sum, curr) => sum + (curr._avg.sentiment || 0), 0) /
          categoryStats.length
        : 0

    const trends = await db.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(sentiment) as avg_sentiment
      FROM extracted_pains
      WHERE workspace_id = ${workspaceId}
        AND created_at >= ${dateFrom}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    const sentimentCounts = await db.$queryRaw`
      SELECT
        CASE
          WHEN sentiment >= 0.3 THEN 'positive'
          WHEN sentiment <= -0.3 THEN 'negative'
          ELSE 'neutral'
        END as sentiment_type,
        COUNT(*) as count
      FROM extracted_pains
      WHERE workspace_id = ${workspaceId}
        AND created_at >= ${dateFrom}
      GROUP BY sentiment_type
    `

    const sentimentDistribution: any = {
      positive: 0,
      neutral: 0,
      negative: 0,
    }

    ;(sentimentCounts as any[]).forEach((row: any) => {
      sentimentDistribution[row.sentiment_type] = Number(row.count)
    })

    return NextResponse.json({
      overview: {
        totalPains,
        totalPosts,
        topCategory,
        avgSentiment: Math.round(avgSentiment * 100) / 100,
      },
      topPains,
      trends,
      sentimentDistribution,
      recentScans,
    })
  } catch (error: any) {
    console.error('Dashboard GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
