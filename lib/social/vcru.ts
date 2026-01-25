/**
 * VC.ru Integration via Search API
 *
 * Преимущества:
 * - Реальный поиск по всей базе статей
 * - Бизнес и стартап контент на русском
 * - Статистика (likes, comments, views) доступна
 */

export interface VCruPost {
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
 * Поиск постов на VC.ru по ключевому слову через API
 *
 * @param keyword - ключевое слово для поиска
 * @param limit - максимальное количество результатов
 * @returns массив постов
 */
export async function searchVCru(
  keyword: string,
  limit: number = 50
): Promise<VCruPost[]> {
  try {
    const encodedQuery = encodeURIComponent(keyword)
    const apiUrl = `https://api.vc.ru/v2.31/search?query=${encodedQuery}`

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PainRadar/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`VC.ru API returned ${response.status}`)
    }

    const data = await response.json()
    const items = data.result?.items || []

    return items
      .filter((item: any) => item.type === 'entry')
      .slice(0, limit)
      .map((item: any) => {
        const entry = item.data
        return {
          id: entry.id?.toString() || '',
          author: entry.author?.name || 'Unknown',
          title: entry.title || '',
          content: (entry.intro || entry.blocks?.[0]?.data?.text || '').slice(0, 500),
          url: entry.url || `https://vc.ru/${entry.id}`,
          score: entry.likes?.count || 0,
          comments: entry.commentsCount || 0,
          createdAt: new Date(entry.dateRFC || entry.date * 1000 || Date.now()),
        }
      })
  } catch (error: any) {
    console.error('VC.ru API search error:', error)
    throw new Error(`Failed to search VC.ru: ${error.message}`)
  }
}

/**
 * Поиск постов (API ищет по всем разделам сразу)
 *
 * @param keyword - ключевое слово
 * @returns массив постов
 */
export async function searchVCruSections(keyword: string): Promise<VCruPost[]> {
  // API поиска VC.ru ищет по всем статьям сразу
  return searchVCru(keyword)
}

/**
 * Примеры полезных поисковых запросов для болей (на русском)
 */
export const VCRU_PAIN_QUERIES = [
  'проблема',
  'сложность',
  'не хватает',
  'боль',
  'неудобно',
  'долго',
  'дорого',
  'не работает',
  'ищу решение',
  'нужен сервис',
] as const

/**
 * Категории контента VC.ru для мониторинга
 */
export const VCRU_CATEGORIES = {
  BUSINESS: 'Бизнес',
  STARTUPS: 'Стартапы',
  MARKETING: 'Маркетинг',
  TECH: 'Технологии',
  MANAGEMENT: 'Менеджмент',
} as const
