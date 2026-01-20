/**
 * Habr Integration via RSS
 *
 * Преимущества:
 * - Бесплатный RSS без API ключей
 * - Русскоязычный IT-контент высокого качества
 * - Готовые хабы по темам (startups, management, etc.)
 */

import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: ['category', 'dc:creator'],
  },
})

export interface HabrPost {
  id: string
  author: string
  title: string
  content: string
  url: string
  score: number
  comments: number
  createdAt: Date
  hub?: string
}

/**
 * Поиск постов на Habr по ключевому слову
 *
 * @param keyword - ключевое слово для поиска
 * @param hub - опциональный хаб для фильтрации
 * @returns массив постов
 */
export async function searchHabr(
  keyword: string,
  hub?: string
): Promise<HabrPost[]> {
  try {
    // RSS feed для хаба или всех постов
    const feedUrl = hub
      ? `https://habr.com/ru/rss/hub/${hub}/articles/all/?fl=ru`
      : `https://habr.com/ru/rss/all/?fl=ru`

    const feed = await parser.parseURL(feedUrl)

    // Фильтрация по ключевому слову
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
        score: 0, // RSS не предоставляет score
        comments: 0, // Требуется дополнительный парсинг
        createdAt: new Date(item.pubDate || Date.now()),
        hub: hub,
      }))
  } catch (error: any) {
    console.error('Habr RSS search error:', error)
    throw new Error(`Failed to search Habr: ${error.message}`)
  }
}

/**
 * Получить посты из нескольких хабов одновременно
 *
 * @param keyword - ключевое слово
 * @param hubs - массив хабов для поиска
 * @returns объединенный массив постов
 */
export async function searchMultipleHubs(
  keyword: string,
  hubs: string[]
): Promise<HabrPost[]> {
  try {
    const searches = hubs.map((hub) => searchHabr(keyword, hub))
    const results = await Promise.allSettled(searches)

    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r: any) => r.value)
  } catch (error: any) {
    console.error('Multiple hubs search error:', error)
    throw new Error(`Failed to search multiple hubs: ${error.message}`)
  }
}

/**
 * Рекомендуемые хабы для поиска болей бизнеса
 */
export const HABR_HUBS = [
  'startups', // Стартапы
  'business', // Бизнес
  'management', // Менеджмент
  'freelance', // Фриланс
  'productivity', // Продуктивность
  'crm_systems', // CRM системы
  'small_business', // Малый бизнес
  'marketing', // Маркетинг
  'sales', // Продажи
  'project_management', // Управление проектами
] as const

/**
 * Примеры полезных поисковых запросов для болей (на русском)
 */
export const HABR_PAIN_QUERIES = [
  'сложно',
  'проблема',
  'не получается',
  'трата времени',
  'неудобно',
  'боль',
  'раздражает',
  'хотелось бы',
  'нужен инструмент',
  'ищу решение',
] as const
