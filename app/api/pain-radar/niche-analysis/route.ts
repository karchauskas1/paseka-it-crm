/**
 * API для полного анализа ниши
 *
 * POST /api/pain-radar/niche-analysis
 * Body: { workspaceId, niche, platforms?, limit? }
 * Response: { keywords, posts, analysis, stats }
 *
 * Процесс:
 * 1. AI генерирует ключевые слова по нише
 * 2. Ищем посты по всем ключевым словам
 * 3. AI анализирует найденные посты
 * 4. Возвращаем готовые проблемы и инсайты
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { searchAllPlatforms, deduplicatePosts, filterByEngagement } from '@/lib/social/unified-search'
import { SocialPlatform } from '@prisma/client'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Проблемные индикаторы для scoring
const PROBLEM_INDICATORS = [
  'проблем', 'ошибк', 'не работа', 'не могу', 'помоги',
  'подскажи', 'что делать', 'как быть', 'устал', 'надоел',
  'бесит', 'разочаров', 'обман', 'кину', 'сломал', 'испорти',
  'не получается', 'не выходит', 'застрял', 'нужен совет',
  'кто сталкивался', 'у кого было', 'как решить', 'как исправить',
  'косяк', 'баг', 'глюк', 'фейл', 'провал', 'неудач',
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

  return Math.min(100, matchCount * 20)
}

/**
 * Генерация ключевых слов по нише через AI
 */
async function generateKeywords(niche: string): Promise<string[]> {
  const prompt = `Ты эксперт по анализу болей и проблем в бизнесе.

Ниша/Сфера бизнеса: "${niche}"

Твоя задача: сгенерировать список из 10-15 ключевых слов и фраз на русском языке, по которым нужно искать упоминания проблем, болей и сложностей в этой нише.

Ключевые слова должны быть:
- Связаны с проблемами, сложностями, болями в этой нише
- На русском языке
- Разнообразными (общие проблемы, специфичные термины, жаргон)
- Фокусированы на поиске негатива и проблем

Примеры форматов:
- "проблема [термин]"
- "сложно [действие]"
- "[термин] не работает"
- "боль [аудитория]"
- конкретные термины ниши

Верни ТОЛЬКО массив ключевых слов в формате JSON, без дополнительного текста:
["ключевое слово 1", "ключевое слово 2", ...]`

  const models = [
    'google/gemini-2.0-flash-exp:free',
    'anthropic/claude-3.5-haiku',
    'openai/gpt-4o-mini',
  ]

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'PASEKA IT CRM - Pain Radar',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) continue

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) continue

      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) continue

      const keywords: string[] = JSON.parse(jsonMatch[0])
      return keywords.filter((k) => typeof k === 'string' && k.trim().length > 0)
    } catch (error) {
      console.error(`Failed with model ${model}:`, error)
      continue
    }
  }

  throw new Error('Failed to generate keywords')
}

/**
 * AI анализ найденных постов
 */
async function analyzePosts(posts: ScoredPost[], niche: string) {
  const postsForAnalysis = posts.slice(0, 30).map((p, i) => ({
    n: i + 1,
    title: (p.title || p.content).slice(0, 200),
    platform: p.platform,
    engagement: p.engagementScore,
    likes: p.likes,
    comments: p.comments,
  }))

  const prompt = `Ты — аналитик проблем пользователей. Проанализируй найденные посты по нише "${niche}".

ПОСТЫ:
${postsForAnalysis.map(p => `${p.n}. [${p.platform}] ${p.title} (${p.likes} likes, ${p.comments} comments)`).join('\n')}

ЗАДАЧА:
1. Выдели 3-5 основных КАТЕГОРИЙ проблем (например: "Цена", "Качество", "Сервис")
2. Для каждой категории укажи количество постов и 1-2 примера
3. Сформулируй 3-5 ключевых ИНСАЙТОВ (что беспокоит людей больше всего)
4. Дай 2-3 РЕКОМЕНДАЦИИ для бизнеса

ФОРМАТ ОТВЕТА (строго JSON):
{
  "summary": "Краткое резюме в 2-3 предложениях",
  "categories": [
    {"name": "Название категории", "count": 5, "examples": ["пример 1", "пример 2"]}
  ],
  "topInsights": ["инсайт 1", "инсайт 2"],
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}

Отвечай ТОЛЬКО JSON, без markdown и пояснений.`

  const models = [
    'google/gemini-2.0-flash-exp:free',
    'anthropic/claude-3.5-haiku',
    'openai/gpt-4o-mini',
  ]

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'PASEKA IT CRM - Pain Radar',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      })

      if (!response.ok) continue

      const data = await response.json()
      const rawAnalysis = data.choices?.[0]?.message?.content || ''

      const jsonStr = rawAnalysis
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      const parsed = JSON.parse(jsonStr)

      return {
        summary: parsed.summary || 'Анализ завершён',
        categories: parsed.categories || [],
        topInsights: parsed.topInsights || [],
        recommendations: parsed.recommendations || [],
      }
    } catch (error) {
      console.error(`Failed analysis with model ${model}:`, error)
      continue
    }
  }

  return {
    summary: 'Анализ не удался',
    categories: [],
    topInsights: [],
    recommendations: [],
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      workspaceId,
      niche,
      platforms = ['HACKERNEWS', 'HABR', 'VCRU'],
      limit = 50,
    } = body

    if (!workspaceId || !niche) {
      return NextResponse.json(
        { error: 'Workspace ID and niche required' },
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

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      )
    }

    console.log('[Niche Analysis] Step 1: Generating keywords for:', niche)

    // Шаг 1: Генерируем ключевые слова
    const keywords = await generateKeywords(niche)
    console.log('[Niche Analysis] Generated keywords:', keywords)

    // Шаг 2: Ищем посты по всем ключевым словам
    console.log('[Niche Analysis] Step 2: Searching posts')
    const allPosts: any[] = []

    for (const keyword of keywords.slice(0, 5)) { // Берём топ-5 ключевых слов
      try {
        const result = await searchAllPlatforms({
          keyword,
          platforms: platforms as SocialPlatform[],
          limit: 20,
        })
        allPosts.push(...result.posts)
      } catch (error) {
        console.error(`Search failed for keyword: ${keyword}`, error)
      }
    }

    console.log('[Niche Analysis] Found total posts:', allPosts.length)

    // Дедупликация
    const uniquePosts = deduplicatePosts(allPosts)
    console.log('[Niche Analysis] After deduplication:', uniquePosts.length)

    // Scoring
    const scoredPosts: ScoredPost[] = uniquePosts.map(post => {
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
    const topPosts = scoredPosts.slice(0, limit)

    // Шаг 3: AI анализ
    console.log('[Niche Analysis] Step 3: AI analysis')
    const analysis = await analyzePosts(topPosts, niche)

    // Статистика
    const avgEngagement = topPosts.length > 0
      ? Math.round(topPosts.reduce((sum, p) => sum + p.engagementScore, 0) / topPosts.length)
      : 0
    const avgProblemScore = topPosts.length > 0
      ? Math.round(topPosts.reduce((sum, p) => sum + p.problemScore, 0) / topPosts.length)
      : 0

    console.log('[Niche Analysis] Completed successfully')

    return NextResponse.json({
      niche,
      keywords,
      posts: topPosts,
      analysis,
      stats: {
        totalFound: allPosts.length,
        afterDedup: uniquePosts.length,
        returned: topPosts.length,
        avgEngagement,
        avgProblemScore,
      },
    })
  } catch (error: any) {
    console.error('[Niche Analysis] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Niche analysis failed' },
      { status: 500 }
    )
  }
}
