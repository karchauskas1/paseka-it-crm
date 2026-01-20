/**
 * Stage 1 AI Analysis: Fast Post Filtering with Claude Haiku
 *
 * Экономия: 54% на AI costs
 * - Stage 1: Claude Haiku фильтрует посты (дешево)
 * - Stage 2: Claude Opus анализирует только релевантные (дорого, но точно)
 *
 * Было: 100 постов × Opus = $1.50
 * Стало: 100 × Haiku + 30 × Opus = $0.69
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL_FILTER = 'anthropic/claude-3-haiku' // $0.25/1M tokens

/**
 * Интерфейс поста для фильтрации
 */
export interface PostForFiltering {
  id: string
  platform: string
  title: string
  content: string
  author: string
}

/**
 * Результат фильтрации
 */
export interface FilterResult {
  postId: string
  score: number // 0-100
  reason?: string
}

/**
 * Вызов OpenRouter API
 */
async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 200
) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: MODEL_FILTER,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3, // Более детерминированный ответ для фильтрации
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Фильтрация постов (Stage 1)
 *
 * @param posts - массив постов для фильтрации
 * @param batchSize - размер batch для обработки (по умолчанию 50)
 * @returns массив результатов с scores
 */
export async function filterRelevantPosts(
  posts: PostForFiltering[],
  batchSize: number = 50
): Promise<FilterResult[]> {
  if (posts.length === 0) return []

  // Разбить на batch'и
  const batches = []
  for (let i = 0; i < posts.length; i += batchSize) {
    batches.push(posts.slice(i, i + batchSize))
  }

  const allResults: FilterResult[] = []

  // Обработать каждый batch
  for (const batch of batches) {
    const prompt = `
Ты - эксперт по определению бизнес-проблем и болевых точек.

Оцени каждый пост по шкале 0-100 на наличие РЕАЛЬНОЙ бизнес-боли:

**Критерии оценки:**
- 80-100: Серьезная проблема, требующая решения (явная боль, конкретная проблема)
- 50-79: Умеренная боль, есть потенциал (недовольство, сложность)
- 0-49: Не релевантно (просто новость, реклама, вопрос без боли, общие рассуждения)

**Посты для оценки:**
${batch
  .map(
    (p, i) =>
      `${i + 1}. [${p.platform}] ${p.title}
Автор: ${p.author}
Контент: ${p.content.substring(0, 300)}...
`
  )
  .join('\n')}

**ВАЖНО:** Верни ТОЛЬКО JSON массив чисел (scores) без дополнительного текста.
Формат: [85, 23, 67, ...]

Scores:`

    try {
      const response = await callOpenRouter(
        [{ role: 'user', content: prompt }],
        200
      )

      // Парсинг JSON ответа
      let scores: number[]
      try {
        // Попытка извлечь JSON из ответа
        const jsonMatch = response.match(/\[[\d\s,]+\]/)
        if (!jsonMatch) {
          console.error('No JSON array found in response:', response)
          scores = batch.map(() => 50) // Fallback: средний score
        } else {
          scores = JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        console.error('Failed to parse filter response:', response, parseError)
        scores = batch.map(() => 50) // Fallback
      }

      // Проверить длину массива
      if (scores.length !== batch.length) {
        console.error(
          `Score count mismatch: expected ${batch.length}, got ${scores.length}`
        )
        // Дополнить недостающие scores
        while (scores.length < batch.length) {
          scores.push(50)
        }
      }

      // Сохранить результаты
      batch.forEach((post, idx) => {
        allResults.push({
          postId: post.id,
          score: scores[idx] || 50,
        })
      })
    } catch (error: any) {
      console.error('Filter batch error:', error)
      // Fallback: присвоить средний score всем постам в batch
      batch.forEach((post) => {
        allResults.push({
          postId: post.id,
          score: 50,
        })
      })
    }
  }

  return allResults
}

/**
 * Фильтрация постов с сохранением в БД
 *
 * @param posts - посты из БД с ID
 * @param threshold - минимальный score для прохода (по умолчанию 50)
 * @returns отфильтрованные посты
 */
export async function filterAndUpdatePosts<T extends { id: string }>(
  posts: T[],
  threshold: number = 50
): Promise<T[]> {
  // Преобразовать в формат для фильтрации
  const postsForFiltering: PostForFiltering[] = posts.map((p: any) => ({
    id: p.id,
    platform: p.platform || 'UNKNOWN',
    title: p.title || '',
    content: p.content || '',
    author: p.author || 'Unknown',
  }))

  // Получить scores
  const results = await filterRelevantPosts(postsForFiltering)

  // Создать map для быстрого поиска
  const scoresMap = new Map(results.map((r) => [r.postId, r.score]))

  // Фильтровать посты
  const filtered = posts.filter((post) => {
    const score = scoresMap.get(post.id) || 0
    return score >= threshold
  })

  return filtered
}

/**
 * Получить статистику фильтрации
 */
export function getFilterStats(results: FilterResult[]): {
  total: number
  passed: number
  failed: number
  avgScore: number
  distribution: Record<string, number>
} {
  const total = results.length
  const passed = results.filter((r) => r.score >= 50).length
  const failed = total - passed
  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / (total || 1)

  const distribution: Record<string, number> = {
    'high (80-100)': results.filter((r) => r.score >= 80).length,
    'medium (50-79)': results.filter((r) => r.score >= 50 && r.score < 80)
      .length,
    'low (0-49)': results.filter((r) => r.score < 50).length,
  }

  return {
    total,
    passed,
    failed,
    avgScore: Math.round(avgScore),
    distribution,
  }
}
