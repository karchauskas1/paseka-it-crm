import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { filterRelevantPosts, getFilterStats } from '@/lib/ai/filter-posts'
import { extractPainsFromPosts } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { postIds, workspaceId } = body

    if (!workspaceId || !postIds || !Array.isArray(postIds)) {
      return NextResponse.json(
        { error: 'Workspace ID and post IDs required' },
        { status: 400 }
      )
    }

    if (postIds.length === 0) {
      return NextResponse.json({ error: 'No posts selected' }, { status: 400 })
    }

    if (postIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 posts per batch' },
        { status: 400 }
      )
    }

    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[Pain Radar] Starting analysis for', postIds.length, 'posts')

    const posts = await db.socialPost.findMany({
      where: {
        id: { in: postIds },
        keyword: { workspaceId },
      },
    })

    if (posts.length === 0) {
      return NextResponse.json({ error: 'No posts found' }, { status: 404 })
    }

    console.log('[Pain Radar] Stage 1: Filtering with Haiku')

    const filterResults = await filterRelevantPosts(
      posts.map(p => ({
        id: p.id,
        platform: p.platform,
        title: p.content.substring(0, 100),
        content: p.content,
        author: p.author,
      }))
    )

    const filterStats = getFilterStats(filterResults)
    console.log('[Pain Radar] Filter stats:', filterStats)

    await Promise.all(
      filterResults.map(result =>
        db.socialPost.update({
          where: { id: result.postId },
          data: {
            filterScore: result.score,
            filteredAt: new Date(),
          },
        })
      )
    )

    const relevantPostIds = filterResults
      .filter(r => r.score >= 50)
      .map(r => r.postId)

    console.log(
      '[Pain Radar] Stage 2: Deep analysis for',
      relevantPostIds.length,
      'relevant posts'
    )

    if (relevantPostIds.length === 0) {
      return NextResponse.json({
        analyzed: posts.length,
        filtered: 0,
        painsExtracted: 0,
        pains: [],
        filterStats,
      })
    }

    const relevantPosts = posts.filter(p => relevantPostIds.includes(p.id))

    const analysisResults = await extractPainsFromPosts(
      relevantPosts.map(p => ({
        id: p.id,
        content: p.content,
        author: p.author,
      }))
    )

    console.log('[Pain Radar] Extracted pains from', analysisResults.length, 'posts')

    const allPains = []
    for (const result of analysisResults) {
      for (const pain of result.pains) {
        const created = await db.extractedPain.create({
          data: {
            postId: result.postId,
            workspaceId,
            painText: pain.painText,
            category: pain.category,
            severity: pain.severity,
            sentiment: pain.sentiment,
            confidence: pain.confidence,
            keywords: pain.keywords,
            context: pain.context,
          },
        })
        allPains.push(created)
      }
    }

    await Promise.all(
      relevantPostIds.map(postId =>
        db.socialPost.update({
          where: { id: postId },
          data: {
            isAnalyzed: true,
            analyzedAt: new Date(),
          },
        })
      )
    )

    await db.activity.create({
      data: {
        workspaceId,
        type: 'CREATE',
        entityType: 'pain_analysis',
        entityId: workspaceId,
        action: 'Analyzed ' + posts.length + ' posts, extracted ' + allPains.length + ' pains',
        userId: user.id,
      },
    })

    console.log('[Pain Radar] Analysis completed:', allPains.length, 'pains extracted')

    return NextResponse.json({
      analyzed: posts.length,
      filtered: relevantPostIds.length,
      painsExtracted: allPains.length,
      pains: allPains,
      filterStats,
    })
  } catch (error: any) {
    console.error('[Pain Radar] Analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
