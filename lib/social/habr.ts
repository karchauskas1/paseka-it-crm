/**
 * Habr Integration via Search API
 *
 * Преимущества:
 * - Реальный поиск по всей базе статей
 * - Русскоязычный IT-контент высокого качества
 * - Статистика (score, comments) доступна
 */

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
 * Поиск постов на Habr по ключевому слову через API
 *
 * @param keyword - ключевое слово для поиска
 * @param hub - опциональный хаб для фильтрации (не используется в API поиска)
 * @returns массив постов
 */
export async function searchHabr(
  keyword: string,
  hub?: string
): Promise<HabrPost[]> {
  try {
    const encodedQuery = encodeURIComponent(keyword)
    const apiUrl = `https://habr.com/kek/v2/articles?query=${encodedQuery}&fl=ru&hl=ru&perPage=50`

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PainRadar/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`Habr API returned ${response.status}`)
    }

    const data = await response.json()
    const refs = data.publicationRefs || {}

    return Object.values(refs).map((article: any) => ({
      id: article.id?.toString() || '',
      author: article.author?.alias || article.author?.fullname || 'Unknown',
      title: article.titleHtml?.replace(/<[^>]*>/g, '') || '',
      content: article.leadData?.textHtml?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
      url: `https://habr.com/ru/articles/${article.id}/`,
      score: article.statistics?.score || 0,
      comments: article.statistics?.commentsCount || 0,
      createdAt: new Date(article.timePublished || Date.now()),
      hub: hub,
    }))
  } catch (error: any) {
    console.error('Habr API search error:', error)
    throw new Error(`Failed to search Habr: ${error.message}`)
  }
}

/**
 * Поиск постов (API ищет по всем хабам сразу)
 *
 * @param keyword - ключевое слово
 * @param hubs - не используется (API ищет везде)
 * @returns массив постов
 */
export async function searchMultipleHubs(
  keyword: string,
  hubs: string[]
): Promise<HabrPost[]> {
  // API поиска Habr ищет по всем статьям сразу
  return searchHabr(keyword)
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
