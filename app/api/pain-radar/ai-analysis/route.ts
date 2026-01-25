import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * AI Analysis API
 * Анализирует посты через OpenRouter API
 * Возвращает категории, инсайты и рекомендации
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Модели на OpenRouter (от дешёвых к дорогим)
const MODELS = [
  'google/gemini-2.0-flash-001',    // $0.1/M токенов - очень дёшево
  'anthropic/claude-3-haiku',       // $0.25/M - дёшево и качественно
  'openai/gpt-4o-mini',             // $0.15/M - баланс цена/качество
]

interface Post {
  title: string
  content: string
  platform: string
  likes: number
  comments: number
  engagementScore: number
  problemScore: number
}

interface AnalysisResult {
  summary: string
  categories: {
    name: string
    count: number
    examples: string[]
  }[]
  topInsights: string[]
  recommendations: string[]
}

async function analyzeWithModel(
  posts: Post[],
  topic: string,
  apiKey: string,
  modelIndex: number = 0
): Promise<AnalysisResult> {
  if (modelIndex >= MODELS.length) {
    throw new Error('All AI models unavailable')
  }

  const model = MODELS[modelIndex]

  // Готовим данные для анализа (топ 30 постов)
  const postsForAnalysis = posts.slice(0, 30).map((p, i) => ({
    n: i + 1,
    title: (p.title || p.content).slice(0, 200),
    platform: p.platform,
    engagement: p.engagementScore,
    likes: p.likes,
    comments: p.comments,
  }))

  const prompt = `Ты — аналитик проблем пользователей. Проанализируй найденные посты по теме "${topic}".

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

  console.log(`[AI Analysis] Using model: ${model}`)

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://paseka-crm.local',
      'X-Title': 'PASEKA CRM Pain Radar',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[AI Analysis] Model ${model} failed:`, response.status, errorText)

    // Пробуем следующую модель
    return analyzeWithModel(posts, topic, apiKey, modelIndex + 1)
  }

  const data = await response.json()
  const rawAnalysis = data.choices?.[0]?.message?.content || ''

  // Парсим JSON из ответа
  try {
    // Убираем возможные markdown обёртки
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
  } catch {
    console.error('[AI Analysis] Failed to parse JSON:', rawAnalysis.slice(0, 200))
    // Возвращаем сырой анализ как summary
    return {
      summary: rawAnalysis.slice(0, 500),
      categories: [],
      topInsights: [],
      recommendations: [],
    }
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, posts, topic } = body

    if (!workspaceId || !posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'Workspace ID and posts array required' },
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

    // Получить API ключ из env
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI analysis not configured (missing API key)' },
        { status: 503 }
      )
    }

    console.log('[AI Analysis] Starting analysis for topic:', topic)
    console.log('[AI Analysis] Posts count:', posts.length)

    const analysis = await analyzeWithModel(posts, topic || 'общая тема', apiKey)

    console.log('[AI Analysis] Completed successfully')

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error: any) {
    console.error('[AI Analysis] Error:', error)
    return NextResponse.json(
      { error: error.message || 'AI analysis failed' },
      { status: 500 }
    )
  }
}
