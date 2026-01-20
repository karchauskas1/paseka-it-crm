/**
 * Hacker News Integration via Algolia API
 *
 * Преимущества:
 * - 100% бесплатный, без регистрации
 * - Нет rate limits (только pagination до 1000)
 * - Качественные технические дискуссии
 * - Ask HN / Show HN = готовые боли
 */

export interface HackerNewsPost {
  id: string
  author: string
  title: string
  content: string
  url: string
  score: number
  comments: number
  createdAt: Date
}

/**
 * Поиск постов на Hacker News по ключевому слову
 *
 * @param keyword - ключевое слово для поиска
 * @param limit - максимальное количество результатов (по умолчанию 50)
 * @returns массив постов
 */
export async function searchHackerNews(
  keyword: string,
  limit: number = 50
): Promise<HackerNewsPost[]> {
  try {
    // Algolia HN API endpoint
    const params = new URLSearchParams({
      query: keyword,
      tags: 'ask_hn,show_hn', // Только Ask HN и Show HN
      numericFilters: 'points>20,num_comments>5', // Качественный контент
      hitsPerPage: Math.min(limit, 100).toString(), // Max 100 per request
    })

    const response = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?${params}`,
      {
        headers: {
          'User-Agent': 'PASEKA_CRM_PainRadar/1.0',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HN Algolia API error: ${response.status}`)
    }

    const data = await response.json()

    return data.hits.map((hit: any) => ({
      id: hit.objectID,
      author: hit.author || 'Unknown',
      title: hit.title || hit.story_title || '',
      content: hit.story_text || hit.comment_text || hit.title || '',
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      score: hit.points || 0,
      comments: hit.num_comments || 0,
      createdAt: new Date(hit.created_at),
    }))
  } catch (error: any) {
    console.error('Hacker News search error:', error)
    throw new Error(`Failed to search Hacker News: ${error.message}`)
  }
}

/**
 * Рекомендуемые теги для мониторинга
 */
export const HN_TAGS = {
  ASK: 'ask_hn', // Ask HN - вопросы сообщества
  SHOW: 'show_hn', // Show HN - демонстрация проектов
  STORY: 'story', // Обычные истории
  COMMENT: 'comment', // Комментарии
} as const

/**
 * Примеры полезных поисковых запросов для болей
 */
export const HN_PAIN_QUERIES = [
  'struggling with',
  'frustrated by',
  'hard to',
  'pain point',
  'problem with',
  'difficult to',
  'annoying that',
  'wish there was',
  'need a better way',
  'wasting time on',
] as const
