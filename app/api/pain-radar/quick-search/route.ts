import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { searchAllPlatforms, deduplicatePosts, filterByEngagement } from '@/lib/social/unified-search'
import { SocialPlatform } from '@prisma/client'

/**
 * Quick Search API
 * Поиск постов без сохранения keyword в БД
 * Возвращает посты с scoring для анализа
 */

// Проблемные индикаторы для scoring
const PROBLEM_INDICATORS = [
  'проблем', 'ошибк', 'не работа', 'не могу', 'помоги',
  'подскажи', 'что делать', 'как быть', 'устал', 'надоел',
  'бесит', 'разочаров', 'обман', 'кину', 'сломал', 'испорти',
  'не получается', 'не выходит', 'застрял', 'нужен совет',
  'кто сталкивался', 'у кого было', 'как решить', 'как исправить',
  'косяк', 'баг', 'глюк', 'фейл', 'провал', 'неудач',
  // English
  'problem', 'issue', 'error', 'bug', 'help', 'stuck',
  'frustrated', 'broken', 'doesn\'t work', 'can\'t', 'failed',
]

interface ScoredPost {
  id: string
  platform: string
  author: string
  title: string
  content: string
  url: string
  likes: number
  comments: number
  engagement: number
  engagementScore: number
  problemScore: number
  totalScore: number
  createdAt: Date
}

function calculateEngagementScore(engagement: number): number {
  // Логарифмическая шкала: log(1) = 0, log(100) ≈ 46, log(10000) ≈ 92
  const normalizedScore = engagement > 0 ? Math.log10(engagement + 1) * 20 : 0
  return Math.min(100, Math.round(normalizedScore))
}

function calculateProblemScore(text: string): number {
  const lowerText = text.toLowerCase()
  let matchCount = 0

  for (const indicator of PROBLEM_INDICATORS) {
    if (lowerText.includes(indicator.toLowerCase())) {
      matchCount++
    }
  }

  // Нормализуем: 0 слов = 0, 5+ слов = 100
  return Math.min(100, matchCount * 20)
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspaceId,
      query,
      platforms = ['HACKERNEWS', 'HABR', 'VCRU'],
      limit = 50,
      minEngagement = 0,
      dedupe = true,
    } = body

    if (!workspaceId || !query) {
      return NextResponse.json(
        { error: 'Workspace ID and query required' },
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

    console.log('[Quick Search] Starting search for:', query)
    console.log('[Quick Search] Platforms:', platforms)

    // Поиск по всем платформам
    const result = await searchAllPlatforms({
      keyword: query,
      platforms: platforms as SocialPlatform[],
      limit: limit * 2, // Берём больше, т.к. будем фильтровать
    })

    console.log('[Quick Search] Found:', result.posts.length, 'posts')

    // Дедупликация
    let posts = dedupe ? deduplicatePosts(result.posts) : result.posts

    // Фильтрация по engagement
    if (minEngagement > 0) {
      posts = filterByEngagement(posts, minEngagement)
    }

    // Scoring
    const scoredPosts: ScoredPost[] = posts.map(post => {
      const text = `${post.title} ${post.content}`
      const engagementScore = calculateEngagementScore(post.engagement)
      const problemScore = calculateProblemScore(text)
      const totalScore = Math.round(engagementScore * 0.6 + problemScore * 0.4)

      return {
        id: post.id,
        platform: post.platform,
        author: post.author,
        title: post.title,
        content: post.content,
        url: post.url,
        likes: post.score,
        comments: post.comments,
        engagement: post.engagement,
        engagementScore,
        problemScore,
        totalScore,
        createdAt: post.createdAt,
      }
    })

    // Сортировка по totalScore
    scoredPosts.sort((a, b) => b.totalScore - a.totalScore)

    // Ограничиваем результат
    const finalPosts = scoredPosts.slice(0, limit)

    // Статистика
    const avgEngagement = finalPosts.length > 0
      ? Math.round(finalPosts.reduce((sum, p) => sum + p.engagementScore, 0) / finalPosts.length)
      : 0
    const avgProblemScore = finalPosts.length > 0
      ? Math.round(finalPosts.reduce((sum, p) => sum + p.problemScore, 0) / finalPosts.length)
      : 0

    // Топ проблемы (высокий engagement + problem score)
    const topProblems = finalPosts
      .filter(p => p.engagementScore >= 20 && p.problemScore >= 20)
      .slice(0, 10)

    return NextResponse.json({
      query,
      posts: finalPosts,
      topProblems,
      stats: {
        total: result.posts.length,
        afterFilter: finalPosts.length,
        byPlatform: result.stats.byPlatform,
        avgEngagement,
        avgProblemScore,
        errors: result.stats.errors,
      },
    })
  } catch (error: any) {
    console.error('[Quick Search] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
