/**
 * LinkedIn Integration via Google Custom Search API
 *
 * Преимущества:
 * - Поиск публичных постов на LinkedIn
 * - Профессиональный B2B контент
 * - Боли и проблемы от бизнес-аудитории
 *
 * Примечание:
 * LinkedIn не предоставляет публичный API для поиска постов.
 * Используем Google Custom Search API с оператором site:linkedin.com
 * Требуется GOOGLE_SEARCH_API_KEY и GOOGLE_SEARCH_ENGINE_ID в .env
 */

export interface LinkedInPost {
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
 * Поиск постов на LinkedIn через Google Custom Search
 *
 * @param keyword - ключевое слово для поиска
 * @param limit - максимальное количество результатов
 * @returns массив постов
 */
export async function searchLinkedIn(
  keyword: string,
  limit: number = 50
): Promise<LinkedInPost[]> {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

    if (!apiKey || !searchEngineId) {
      console.warn('LinkedIn search disabled: GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not configured')
      return []
    }

    const encodedQuery = encodeURIComponent(`${keyword} site:linkedin.com/posts OR site:linkedin.com/pulse`)
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}&num=10`

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Google Search API returned ${response.status}`)
    }

    const data = await response.json()
    const items = data.items || []

    return items.slice(0, Math.min(limit, 10)).map((item: any) => {
      // Извлекаем автора из URL или snippet
      let author = 'LinkedIn User'
      const urlMatch = item.link?.match(/linkedin\.com\/(?:posts|pulse)\/([^\/\?]+)/)
      if (urlMatch) {
        author = urlMatch[1].replace(/-/g, ' ')
      }

      return {
        id: item.cacheId || item.link || '',
        author,
        title: item.title || '',
        content: item.snippet || '',
        url: item.link || '',
        score: 0, // Google Search не предоставляет лайки
        comments: 0, // Google Search не предоставляет комментарии
        createdAt: new Date(), // Google Search не предоставляет дату публикации
      }
    })
  } catch (error: any) {
    console.error('LinkedIn search error:', error)
    throw new Error(`Failed to search LinkedIn: ${error.message}`)
  }
}

/**
 * Альтернативный поиск через Bing Search API (если Google недоступен)
 */
export async function searchLinkedInViaBing(
  keyword: string,
  limit: number = 50
): Promise<LinkedInPost[]> {
  try {
    const apiKey = process.env.BING_SEARCH_API_KEY

    if (!apiKey) {
      console.warn('Bing Search API not configured')
      return []
    }

    const encodedQuery = encodeURIComponent(`${keyword} site:linkedin.com`)
    const apiUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}&count=${Math.min(limit, 50)}`

    const response = await fetch(apiUrl, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Bing Search API returned ${response.status}`)
    }

    const data = await response.json()
    const webPages = data.webPages?.value || []

    return webPages.slice(0, limit).map((page: any) => {
      let author = 'LinkedIn User'
      const urlMatch = page.url?.match(/linkedin\.com\/(?:posts|pulse)\/([^\/\?]+)/)
      if (urlMatch) {
        author = urlMatch[1].replace(/-/g, ' ')
      }

      return {
        id: page.id || page.url || '',
        author,
        title: page.name || '',
        content: page.snippet || '',
        url: page.url || '',
        score: 0,
        comments: 0,
        createdAt: new Date(),
      }
    })
  } catch (error: any) {
    console.error('LinkedIn Bing search error:', error)
    throw new Error(`Failed to search LinkedIn via Bing: ${error.message}`)
  }
}

/**
 * Примеры полезных поисковых запросов для болей
 */
export const LINKEDIN_PAIN_QUERIES = [
  'проблема',
  'сложность',
  'challenge',
  'problem',
  'struggle',
  'difficulty',
  'frustration',
  'pain point',
  'issue',
  'needs solution',
] as const

/**
 * Категории контента LinkedIn для мониторинга
 */
export const LINKEDIN_CATEGORIES = {
  BUSINESS: 'Business',
  LEADERSHIP: 'Leadership',
  SALES: 'Sales',
  MARKETING: 'Marketing',
  TECH: 'Technology',
  ENTREPRENEURSHIP: 'Entrepreneurship',
  STARTUP: 'Startup',
} as const
