import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { scanRequestSchema } from '@/lib/validations/pain-radar'
import { searchReddit, mapRedditPostToDb } from '@/lib/social/reddit'
import { searchWeb, mapWebPostToDb } from '@/lib/social/web-search'
import { socialRateLimiter, withRetry } from '@/lib/social/rate-limiter'
import { RedditAPIError } from '@/lib/pain-radar/errors'
import { translateToEnglish } from '@/lib/ai'
import { z } from 'zod'

// POST /api/pain-radar/scan - Start Reddit scan
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = scanRequestSchema.parse(body)
    const { workspaceId, keywordId, limit, platform } = validatedData

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get keyword
    const keyword = await db.painKeyword.findUnique({
      where: { id: keywordId },
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    if (!keyword.isActive) {
      return NextResponse.json(
        { error: 'Keyword is inactive' },
        { status: 400 }
      )
    }

    // Create scan record
    const scan = await db.painScan.create({
      data: {
        keywordId,
        workspaceId,
        platform,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })

    // Run scan asynchronously (don't await - return immediately)
    runScan(scan.id, keyword.keyword, keywordId, workspaceId, limit, user.id).catch(
      error => {
        console.error('Scan background error:', error)
      }
    )

    return NextResponse.json({
      scanId: scan.id,
      status: 'RUNNING',
      message: 'Scan started successfully',
    })
  } catch (error) {
    console.error('Start scan error:', error)

    if (error instanceof z.ZodError) {
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

// Background scan function
async function runScan(
  scanId: string,
  keyword: string,
  keywordId: string,
  workspaceId: string,
  limit: number,
  userId: string
) {
  try {
    // Get scan details to check platform
    const scanRecord = await db.painScan.findUnique({
      where: { id: scanId },
    })

    const platform = scanRecord?.platform || 'REDDIT'

    // Check rate limit
    await socialRateLimiter.waitForSlot(platform)

    let posts: any[] = []

    if (platform === 'WEB') {
      // Search web (Google/DuckDuckGo)
      console.log(`Scanning Web: "${keyword}"`)
      posts = await withRetry(
        () => searchWeb(keyword, limit),
        3,
        1000
      )
    } else {
      // Translate Russian keywords to English for Reddit search
      const searchKeyword = await translateToEnglish(keyword)
      console.log(`Scanning Reddit: "${keyword}" → "${searchKeyword}"`)

      // Search Reddit with retry logic
      posts = await withRetry(
        () => searchReddit(searchKeyword, limit),
        3,
        1000
      )
    }

    let postsNew = 0
    const savedPosts: any[] = []

    // Save posts to database with deduplication
    for (const post of posts) {
      try {
        const postData = platform === 'WEB' ? mapWebPostToDb(post) : mapRedditPostToDb(post)

        // Check if post already exists
        const existing = await db.socialPost.findUnique({
          where: {
            platform_platformId: {
              platform: platform,
              platformId: post.platformId,
            },
          },
        })

        if (existing) {
          // Update if content changed
          if (existing.content !== postData.content) {
            const updated = await db.socialPost.update({
              where: { id: existing.id },
              data: {
                content: postData.content,
                likes: postData.likes,
                comments: postData.comments,
                engagement: postData.engagement,
              },
            })
            savedPosts.push(updated)
          } else {
            savedPosts.push(existing)
          }
        } else {
          // Create new post
          const newPost = await db.socialPost.create({
            data: {
              ...postData,
              keywordId,
            },
          })
          savedPosts.push(newPost)
          postsNew++
        }
      } catch (postError) {
        console.error('Error saving post:', postError)
        // Continue with other posts
      }
    }

    // Update scan status
    await db.painScan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
        postsFound: posts.length,
        postsNew,
        completedAt: new Date(),
      },
    })

    // Log activity
    await db.activity.create({
      data: {
        workspaceId,
        type: 'CREATE',
        entityType: 'pain_scan',
        entityId: scanId,
        action: 'completed',
        newValue: {
          keyword,
          postsFound: posts.length,
          postsNew,
        },
        userId,
      },
    })
  } catch (error: any) {
    console.error('Scan execution error:', error)

    // Update scan with error
    await db.painScan.update({
      where: { id: scanId },
      data: {
        status: 'FAILED',
        errorMessage: error.message || 'Unknown error',
        completedAt: new Date(),
      },
    })
  }
}
