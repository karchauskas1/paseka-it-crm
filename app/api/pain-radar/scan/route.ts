import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { searchAllPlatforms } from '@/lib/social/unified-search'
import { SocialPlatform } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, keywordId, platforms, limit = 50 } = body

    if (!workspaceId || !keywordId) {
      return NextResponse.json(
        { error: 'Workspace ID and Keyword ID required' },
        { status: 400 }
      )
    }

    // Проверить доступ к workspace
    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получить keyword
    const keyword = await db.painKeyword.findUnique({
      where: { id: keywordId },
    })

    if (!keyword || keyword.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    // Создать PainScan запись
    const scan = await db.painScan.create({
      data: {
        keywordId,
        workspaceId,
        platform: 'HACKERNEWS' as SocialPlatform,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })

    try {
      console.log('[Pain Radar] Starting scan for keyword:', keyword.keyword)

      const selectedPlatforms = platforms || ['HACKERNEWS', 'HABR', 'VCRU', 'TELEGRAM']

      const result = await searchAllPlatforms({
        keyword: keyword.keyword,
        platforms: selectedPlatforms as SocialPlatform[],
        limit,
      })

      console.log('[Pain Radar] Found posts:', result.posts.length)

      let postsNew = 0
      let postsFound = result.posts.length

      for (const post of result.posts) {
        try {
          const existing = await db.socialPost.findUnique({
            where: {
              platform_platformId: {
                platform: post.platform,
                platformId: post.platformId,
              },
            },
          })

          if (existing) {
            if (existing.likes !== post.score || existing.comments !== post.comments) {
              await db.socialPost.update({
                where: { id: existing.id },
                data: {
                  likes: post.score,
                  comments: post.comments,
                  shares: post.shares,
                  engagement: post.engagement,
                },
              })
            }
          } else {
            await db.socialPost.create({
              data: {
                keywordId,
                platform: post.platform,
                platformId: post.platformId,
                author: post.author,
                authorUrl: post.authorUrl,
                content: post.content,
                url: post.url,
                likes: post.score,
                comments: post.comments,
                shares: post.shares,
                engagement: post.engagement,
                publishedAt: post.createdAt,
              },
            })
            postsNew++
          }
        } catch (postError) {
          console.error('[Pain Radar] Error saving post:', postError)
        }
      }

      await db.painScan.update({
        where: { id: scan.id },
        data: {
          status: 'COMPLETED',
          postsFound,
          postsNew,
          completedAt: new Date(),
        },
      })

      await db.activity.create({
        data: {
          workspaceId,
          type: 'CREATE',
          entityType: 'pain_scan',
          entityId: scan.id,
          action: 'Scanned ' + postsFound + ' posts for keyword ' + keyword.keyword + ' (' + postsNew + ' new)',
          userId: user.id,
        },
      })

      console.log('[Pain Radar] Scan completed:', postsFound, 'found,', postsNew, 'new')

      return NextResponse.json({
        scanId: scan.id,
        status: 'COMPLETED',
        postsFound,
        postsNew,
        errors: result.stats.errors,
      })
    } catch (scanError: any) {
      await db.painScan.update({
        where: { id: scan.id },
        data: {
          status: 'FAILED',
          errorMessage: scanError.message,
          completedAt: new Date(),
        },
      })

      console.error('[Pain Radar] Scan error:', scanError)

      return NextResponse.json(
        { error: 'Scan failed', message: scanError.message, scanId: scan.id },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Pain Radar] API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start scan' },
      { status: 500 }
    )
  }
}
