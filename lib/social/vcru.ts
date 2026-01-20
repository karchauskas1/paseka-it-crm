/**
 * VC.ru Integration via RSS
 *
 * Преимущества:
 * - Бесплатный RSS без ключей
 * - Бизнес и стартап контент на русском
 * - Прямые боли предпринимателей
 */

import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: ['dc:creator'],
  },
})

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
 * Поиск постов на VC.ru по ключевому слову
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
    // VC.ru RSS feed для популярных постов
    const feedUrl = 'https://vc.ru/rss/all'

    const feed = await parser.parseURL(feedUrl)

    // Фильтрация по ключевому слову
    const keywordLower = keyword.toLowerCase()

    return feed.items
      .filter((item) => {
        const title = (item.title || '').toLowerCase()
        const content = (item.contentSnippet || item.content || '').toLowerCase()
        return title.includes(keywordLower) || content.includes(keywordLower)
      })
      .slice(0, limit)
      .map((item) => ({
        id: item.guid || item.link || '',
        author: (item as any)['dc:creator'] || item.creator || 'Unknown',
        title: item.title || '',
        content: item.contentSnippet || item.content || '',
        url: item.link || '',
        score: 0, // RSS не предоставляет score
        comments: 0, // RSS не предоставляет количество комментариев
        createdAt: new Date(item.pubDate || Date.now()),
      }))
  } catch (error: any) {
    console.error('VC.ru RSS search error:', error)
    throw new Error(`Failed to search VC.ru: ${error.message}`)
  }
}

/**
 * Получить последние посты из разных разделов VC.ru
 *
 * @param keyword - ключевое слово
 * @returns массив постов
 */
export async function searchVCruSections(keyword: string): Promise<VCruPost[]> {
  try {
    // Доступные RSS feeds на VC.ru
    const feeds = [
      'https://vc.ru/rss/all', // Все посты
      'https://vc.ru/rss/popular', // Популярные
      // Можно добавить другие разделы при необходимости
    ]

    const searches = feeds.map(async (feedUrl) => {
      try {
        const feed = await parser.parseURL(feedUrl)
        const keywordLower = keyword.toLowerCase()

        return feed.items
          .filter((item) => {
            const title = (item.title || '').toLowerCase()
            const content = (item.contentSnippet || item.content || '').toLowerCase()
            return title.includes(keywordLower) || content.includes(keywordLower)
          })
          .map((item) => ({
            id: item.guid || item.link || '',
            author: (item as any)['dc:creator'] || item.creator || 'Unknown',
            title: item.title || '',
            content: item.contentSnippet || item.content || '',
            url: item.link || '',
            score: 0,
            comments: 0,
            createdAt: new Date(item.pubDate || Date.now()),
          }))
      } catch (err) {
        console.error(`Failed to fetch ${feedUrl}:`, err)
        return []
      }
    })

    const results = await Promise.all(searches)
    return results.flat()
  } catch (error: any) {
    console.error('VC.ru sections search error:', error)
    throw new Error(`Failed to search VC.ru sections: ${error.message}`)
  }
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
