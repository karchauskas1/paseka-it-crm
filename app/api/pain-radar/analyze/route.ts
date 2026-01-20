import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { analyzeRequestSchema } from '@/lib/validations/pain-radar'
import { extractPainsFromPosts } from '@/lib/ai'
import { AIAnalysisError } from '@/lib/pain-radar/errors'
import { PAIN_RADAR_LIMITS } from '@/lib/pain-radar/constants'

// POST /api/pain-radar/analyze - Analyze selected posts with AI
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request
    const validatedData = analyzeRequestSchema.parse(body)
    const { postIds, workspaceId } = validatedData

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get posts
    const posts = await db.socialPost.findMany({
      where: {
        id: { in: postIds },
        keyword: { workspaceId },
      },
      include: {
        keyword: {
          select: {
            keyword: true,
            category: true,
          },
        },
      },
    })

    if (posts.length === 0) {
      return NextResponse.json({ error: 'No posts found' }, { status: 404 })
    }

    // Process posts in batches
    const batchSize = PAIN_RADAR_LIMITS.MAX_BATCH_SIZE
    let totalPainsExtracted = 0
    const allExtractedPains: any[] = []

    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize)

      try {
        console.log(`[AI Analysis] Processing batch ${i}-${i + batchSize}, ${batch.length} posts`)

        // Extract pains from batch
        const results = await extractPainsFromPosts(
          batch.map(p => ({
            id: p.id,
            content: p.content,
            author: p.author,
          })),
          batch[0]?.keyword.category || undefined
        )

        console.log(`[AI Analysis] Received results:`, JSON.stringify(results, null, 2))
        console.log(`[AI Analysis] Results count: ${results.length}, Total pains in results: ${results.reduce((sum, r) => sum + r.pains.length, 0)}`)

        // Save extracted pains to database
        for (const result of results) {
          const post = batch.find(p => p.id === result.postId)
          if (!post) {
            console.warn(`[AI Analysis] Post not found for result:`, result.postId)
            continue
          }

          console.log(`[AI Analysis] Post ${result.postId}: ${result.pains.length} pains found`)

          for (const pain of result.pains) {
            const extractedPain = await db.extractedPain.create({
              data: {
                postId: result.postId,
                workspaceId,
                painText: pain.painText,
                category: pain.category,
                severity: pain.severity,
                sentiment: pain.sentiment,
                confidence: pain.confidence,
                keywords: pain.keywords,
                context: post.content.substring(0, 500), // First 500 chars as context
              },
            })

            allExtractedPains.push(extractedPain)
            totalPainsExtracted++
          }

          // Mark post as analyzed
          await db.socialPost.update({
            where: { id: result.postId },
            data: {
              isAnalyzed: true,
              analyzedAt: new Date(),
            },
          })
        }
      } catch (error) {
        console.error(`[AI Analysis] Error analyzing batch ${i}-${i + batchSize}:`, error)
        console.error(`[AI Analysis] Error details:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          batch: batch.map(p => ({ id: p.id, contentLength: p.content.length }))
        })
        // Continue with next batch
      }
    }

    // Log activity
    await db.activity.create({
      data: {
        workspaceId,
        userId: user.id,
        type: 'CREATE',
        action: 'pain_radar.analyze',
        entityType: 'pain_analysis',
        entityId: workspaceId,
        newValue: {
          postsAnalyzed: posts.length,
          painsExtracted: totalPainsExtracted,
        },
      },
    })

    return NextResponse.json({
      analyzed: posts.length,
      painsExtracted: totalPainsExtracted,
      pains: allExtractedPains,
    })
  } catch (error: any) {
    console.error('Analyze error:', error)

    if (error instanceof AIAnalysisError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
