/**
 * Unified Search Interface
 *
 * Объединяет все источники данных для Pain Radar
 * Параллельный поиск по всем платформам
 */

import { SocialPlatform } from '@prisma/client'
import { searchHackerNews, type HackerNewsPost } from './hackernews'
import { searchHabr, searchMultipleHubs, HABR_HUBS, type HabrPost } from './habr'
import { searchVCru, type VCruPost } from './vcru'
import { searchLinkedIn, type LinkedInPost } from './linkedin'
import {
  searchMultipleChannels,
  TARGET_CHANNELS,
  type TelegramPost,
} from './telegram'

/**
 * Унифицированный интерфейс поста из любого источника
 */
export interface UnifiedPost {
  id: string
  platform: SocialPlatform
  platformId: string
  author: string
  authorUrl?: string
  title: string
  content: string
  url: string
  score: number
  comments: number
  shares: number
  engagement: number
  createdAt: Date
}

/**
 * Опции для поиска
 */
export interface SearchOptions {
  keyword: string
  platforms?: SocialPlatform[]
  limit?: number
  habrHubs?: string[]
  telegramChannels?: string[]
}

/**
 * Результат поиска с метаданными
 */
export interface SearchResult {
  posts: UnifiedPost[]
  stats: {
    total: number
    byPlatform: Record<string, number>
    errors: Array<{ platform: string; error: string }>
  }
}

/**
 * Поиск по всем платформам одновременно
 *
 * @param options - опции поиска
 * @returns результат с постами и статистикой
 */
export async function searchAllPlatforms(
  options: SearchOptions
): Promise<SearchResult> {
  const {
    keyword,
    platforms = [
      'HACKERNEWS',
      'HABR',
      'VCRU',
      'LINKEDIN',
      'TELEGRAM',
    ] as SocialPlatform[],
    limit = 50,
    habrHubs = HABR_HUBS.slice(0, 5), // Top 5 хабов по умолчанию
    telegramChannels = TARGET_CHANNELS.slice(0, 5),
  } = options

  const searches: Promise<UnifiedPost[]>[] = []
  const errors: Array<{ platform: string; error: string }> = []

  // Hacker News
  if (platforms.includes('HACKERNEWS')) {
    searches.push(
      searchHackerNews(keyword, limit)
        .then((posts) => posts.map((p) => normalizeHNPost(p)))
        .catch((err) => {
          errors.push({ platform: 'HACKERNEWS', error: err.message })
          return []
        })
    )
  }

  // Habr
  if (platforms.includes('HABR')) {
    searches.push(
      searchMultipleHubs(keyword, habrHubs as string[])
        .then((posts) => posts.map((p) => normalizeHabrPost(p)))
        .catch((err) => {
          errors.push({ platform: 'HABR', error: err.message })
          return []
        })
    )
  }

  // VC.ru
  if (platforms.includes('VCRU')) {
    searches.push(
      searchVCru(keyword, limit)
        .then((posts) => posts.map((p) => normalizeVCruPost(p)))
        .catch((err) => {
          errors.push({ platform: 'VCRU', error: err.message })
          return []
        })
    )
  }

  // LinkedIn
  if (platforms.includes('LINKEDIN')) {
    searches.push(
      searchLinkedIn(keyword, limit)
        .then((posts) => posts.map((p) => normalizeLinkedInPost(p)))
        .catch((err) => {
          errors.push({ platform: 'LINKEDIN', error: err.message })
          return []
        })
    )
  }

  // Telegram
  if (platforms.includes('TELEGRAM')) {
    searches.push(
      searchMultipleChannels(telegramChannels as string[], keyword, limit)
        .then((posts) => posts.map((p) => normalizeTelegramPost(p)))
        .catch((err) => {
          errors.push({ platform: 'TELEGRAM', error: err.message })
          return []
        })
    )
  }

  // Выполнить все поиски параллельно
  const results = await Promise.all(searches)

  // Объединить результаты
  const allPosts = results.flat()

  // Сортировать по дате (новые первые)
  allPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  // Вычислить статистику
  const byPlatform: Record<string, number> = {}
  allPosts.forEach((post) => {
    byPlatform[post.platform] = (byPlatform[post.platform] || 0) + 1
  })

  return {
    posts: allPosts.slice(0, limit),
    stats: {
      total: allPosts.length,
      byPlatform,
      errors,
    },
  }
}

/**
 * Нормализация Hacker News поста
 */
function normalizeHNPost(post: HackerNewsPost): UnifiedPost {
  return {
    id: post.id,
    platform: 'HACKERNEWS' as SocialPlatform,
    platformId: post.id,
    author: post.author,
    authorUrl: `https://news.ycombinator.com/user?id=${post.author}`,
    title: post.title,
    content: post.content,
    url: post.url,
    score: post.score,
    comments: post.comments,
    shares: 0,
    engagement: calculateEngagement({
      likes: post.score,
      comments: post.comments,
      shares: 0,
    }),
    createdAt: post.createdAt,
  }
}

/**
 * Нормализация Habr поста
 */
function normalizeHabrPost(post: HabrPost): UnifiedPost {
  return {
    id: post.id,
    platform: 'HABR' as SocialPlatform,
    platformId: post.id,
    author: post.author,
    authorUrl: `https://habr.com/ru/users/${post.author}/`,
    title: post.title,
    content: post.content,
    url: post.url,
    score: post.score,
    comments: post.comments,
    shares: 0,
    engagement: calculateEngagement({
      likes: post.score,
      comments: post.comments,
      shares: 0,
    }),
    createdAt: post.createdAt,
  }
}

/**
 * Нормализация VC.ru поста
 */
function normalizeVCruPost(post: VCruPost): UnifiedPost {
  return {
    id: post.id,
    platform: 'VCRU' as SocialPlatform,
    platformId: post.id,
    author: post.author,
    title: post.title,
    content: post.content,
    url: post.url,
    score: post.score,
    comments: post.comments,
    shares: 0,
    engagement: calculateEngagement({
      likes: post.score,
      comments: post.comments,
      shares: 0,
    }),
    createdAt: post.createdAt,
  }
}

/**
 * Нормализация LinkedIn поста
 */
function normalizeLinkedInPost(post: LinkedInPost): UnifiedPost {
  return {
    id: post.id,
    platform: 'LINKEDIN' as SocialPlatform,
    platformId: post.id,
    author: post.author,
    title: post.title,
    content: post.content,
    url: post.url,
    score: post.score,
    comments: post.comments,
    shares: 0,
    engagement: calculateEngagement({
      likes: post.score,
      comments: post.comments,
      shares: 0,
    }),
    createdAt: post.createdAt,
  }
}

/**
 * Нормализация Telegram поста
 */
function normalizeTelegramPost(post: TelegramPost): UnifiedPost {
  return {
    id: post.id,
    platform: 'TELEGRAM' as SocialPlatform,
    platformId: post.id,
    author: post.author,
    authorUrl: `https://t.me/${post.channelUsername}`,
    title: post.title,
    content: post.content,
    url: post.url,
    score: post.score, // views
    comments: post.comments,
    shares: 0,
    engagement: calculateEngagement({
      likes: post.score,
      comments: post.comments,
      shares: 0,
    }),
    createdAt: post.createdAt,
  }
}

/**
 * Расчет engagement score
 * Формула: (comments × 3) + (shares × 2) + likes
 */
export function calculateEngagement(metrics: {
  likes: number
  comments: number
  shares: number
}): number {
  return metrics.comments * 3 + metrics.shares * 2 + metrics.likes
}

/**
 * Дедупликация постов по контенту
 * Удаляет дубликаты на основе similarity контента
 */
export function deduplicatePosts(posts: UnifiedPost[]): UnifiedPost[] {
  const seen = new Set<string>()
  const unique: UnifiedPost[] = []

  for (const post of posts) {
    // Создаем fingerprint на основе начала контента
    const fingerprint = post.content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100)

    if (!seen.has(fingerprint)) {
      seen.add(fingerprint)
      unique.push(post)
    }
  }

  return unique
}

/**
 * Фильтрация постов по минимальному engagement
 */
export function filterByEngagement(
  posts: UnifiedPost[],
  minEngagement: number = 10
): UnifiedPost[] {
  return posts.filter((post) => post.engagement >= minEngagement)
}

/**
 * Группировка постов по платформе
 */
export function groupByPlatform(
  posts: UnifiedPost[]
): Record<SocialPlatform, UnifiedPost[]> {
  const groups: Record<string, UnifiedPost[]> = {}

  posts.forEach((post) => {
    if (!groups[post.platform]) {
      groups[post.platform] = []
    }
    groups[post.platform].push(post)
  })

  return groups as Record<SocialPlatform, UnifiedPost[]>
}
