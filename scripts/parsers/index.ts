// Экспорт всех парсеров
export { VCScraper } from './vc-scraper'
export { PikabuScraper } from './pikabu-scraper'
export { XScraper } from './x-scraper'
export { ThreadsScraper } from './threads-scraper'
export { HabrScraper } from './habr-scraper'
export { ZenScraper } from './zen-scraper'
export { TelegramScraper } from './telegram-scraper'
export { MailRuScraper } from './mailru-scraper'
export { TenChatScraper } from './tenchat-scraper'

// Problem Finder
export { ProblemFinder, runProblemSearch } from './problem-finder'
export type { ScoredPost, ProblemSearchResult } from './problem-finder'

// AI Analyzer
export { AIAnalyzer, quickAnalyze } from './ai-analyzer'
export type { AnalysisResult } from './ai-analyzer'

// Экспорт типов
export * from './types'

// Унифицированный класс для работы со всеми платформами
import { VCScraper } from './vc-scraper'
import { PikabuScraper } from './pikabu-scraper'
import { XScraper } from './x-scraper'
import { ThreadsScraper } from './threads-scraper'
import { HabrScraper } from './habr-scraper'
import { ZenScraper } from './zen-scraper'
import { TelegramScraper } from './telegram-scraper'
import { MailRuScraper } from './mailru-scraper'
import { TenChatScraper } from './tenchat-scraper'
import { ParseResult, ParsedProfile, ParserConfig } from './types'

export type Platform = 'vc' | 'pikabu' | 'x' | 'threads' | 'habr' | 'zen' | 'telegram' | 'mailru' | 'tenchat' | 'all'

// Платформы по умолчанию для "all"
const DEFAULT_PLATFORMS: Platform[] = ['habr', 'pikabu', 'vc', 'zen', 'x', 'tenchat', 'mailru']

export class UnifiedScraper {
  private config: ParserConfig

  constructor(config?: ParserConfig) {
    this.config = config || {}
  }

  async scrapePopular(platforms: Platform[] = ['all']): Promise<Record<string, ParseResult>> {
    const results: Record<string, ParseResult> = {}
    const targets = platforms.includes('all') ? DEFAULT_PLATFORMS : platforms

    for (const platform of targets) {
      console.log(`\n📡 Парсинг популярного: ${platform}`)
      results[platform] = await this.scrapePopularPlatform(platform)
    }

    return results
  }

  async scrapeSearch(
    query: string,
    platforms: Platform[] = ['all']
  ): Promise<Record<string, ParseResult>> {
    const results: Record<string, ParseResult> = {}
    const targets = platforms.includes('all') ? DEFAULT_PLATFORMS : platforms

    for (const platform of targets) {
      console.log(`\n🔍 Поиск "${query}" на ${platform}`)
      results[platform] = await this.scrapeSearchPlatform(platform, query)
    }

    return results
  }

  async scrapeProfile(
    username: string,
    platform: Platform
  ): Promise<ParsedProfile | null> {
    const scraper = this.getScraper(platform)
    if (!scraper) {
      console.error(`Неизвестная платформа: ${platform}`)
      return null
    }

    return scraper.scrapeProfile(username)
  }

  async scrapeMultipleProfiles(
    profiles: { username: string; platform: Platform }[]
  ): Promise<ParsedProfile[]> {
    const results: ParsedProfile[] = []

    for (const { username, platform } of profiles) {
      console.log(`👤 Парсинг профиля @${username} на ${platform}`)
      const profile = await this.scrapeProfile(username, platform)
      if (profile) {
        results.push(profile)
      }
    }

    return results
  }

  private async scrapePopularPlatform(platform: Platform): Promise<ParseResult> {
    const scraper = this.getScraper(platform)
    if (!scraper) {
      return this.errorResult(platform, 'Неизвестная платформа')
    }
    return scraper.scrapePopular()
  }

  private async scrapeSearchPlatform(platform: Platform, query: string): Promise<ParseResult> {
    const scraper = this.getScraper(platform)
    if (!scraper) {
      return this.errorResult(platform, 'Неизвестная платформа')
    }
    return scraper.scrapeSearch(query)
  }

  private getScraper(platform: Platform) {
    switch (platform) {
      case 'vc':
        return new VCScraper(this.config)
      case 'pikabu':
        return new PikabuScraper(this.config)
      case 'x':
        return new XScraper(this.config)
      case 'threads':
        return new ThreadsScraper(this.config)
      case 'habr':
        return new HabrScraper(this.config)
      case 'zen':
        return new ZenScraper(this.config)
      case 'telegram':
        return new TelegramScraper(this.config)
      case 'mailru':
        return new MailRuScraper(this.config)
      case 'tenchat':
        return new TenChatScraper(this.config)
      default:
        return null
    }
  }

  private errorResult(platform: string, error: string): ParseResult {
    return {
      success: false,
      platform,
      profiles: [],
      posts: [],
      errors: [error],
      stats: {
        profilesFound: 0,
        postsFound: 0,
        duration: 0,
      },
    }
  }
}

// Утилиты для форматирования результатов
export function formatResultsAsCSV(results: Record<string, ParseResult>): string {
  const lines: string[] = [
    'platform,type,id,title,author,url,likes,comments,views,parsed_at',
  ]

  for (const [platform, result] of Object.entries(results)) {
    for (const post of result.posts) {
      lines.push(
        [
          platform,
          'post',
          post.postId,
          `"${(post.title || post.content).replace(/"/g, '""').slice(0, 100)}"`,
          post.authorUsername,
          post.url,
          post.likes || '',
          post.comments || '',
          post.views || '',
          post.parsedAt.toISOString(),
        ].join(',')
      )
    }

    for (const profile of result.profiles) {
      lines.push(
        [
          platform,
          'profile',
          profile.username,
          `"${profile.displayName}"`,
          profile.username,
          profile.profileUrl,
          profile.followers || '',
          '',
          '',
          profile.parsedAt.toISOString(),
        ].join(',')
      )
    }
  }

  return lines.join('\n')
}

export function formatResultsSummary(results: Record<string, ParseResult>): string {
  const lines: string[] = ['📊 Результаты парсинга:', '']

  let totalPosts = 0
  let totalProfiles = 0

  for (const [platform, result] of Object.entries(results)) {
    const statusIcon = result.success ? '✅' : '❌'
    lines.push(`${statusIcon} ${platform.toUpperCase()}:`)
    lines.push(`   Постов: ${result.posts.length}`)
    lines.push(`   Профилей: ${result.profiles.length}`)
    lines.push(`   Время: ${(result.stats.duration / 1000).toFixed(1)}с`)

    if (result.errors.length > 0) {
      lines.push(`   ⚠️ Ошибки: ${result.errors.length}`)
    }

    lines.push('')

    totalPosts += result.posts.length
    totalProfiles += result.profiles.length
  }

  lines.push(`📈 Всего: ${totalPosts} постов, ${totalProfiles} профилей`)

  return lines.join('\n')
}

// Дедупликация результатов по URL
export function deduplicateResults(results: Record<string, ParseResult>): Record<string, ParseResult> {
  const deduplicated: Record<string, ParseResult> = {}

  for (const [platform, result] of Object.entries(results)) {
    const seenUrls = new Set<string>()
    const uniquePosts = result.posts.filter((post) => {
      // Нормализуем URL (убираем параметры)
      const baseUrl = post.url.split('?')[0]
      if (seenUrls.has(baseUrl)) return false
      seenUrls.add(baseUrl)
      return true
    })

    deduplicated[platform] = {
      ...result,
      posts: uniquePosts,
      stats: {
        ...result.stats,
        postsFound: uniquePosts.length,
      },
    }
  }

  return deduplicated
}

// Сортировка по популярности
export function sortByPopularity(results: Record<string, ParseResult>): Record<string, ParseResult> {
  const sorted: Record<string, ParseResult> = {}

  for (const [platform, result] of Object.entries(results)) {
    const sortedPosts = [...result.posts].sort((a, b) => {
      const scoreA = (a.likes || 0) + (a.views || 0) / 100 + (a.comments || 0) * 10
      const scoreB = (b.likes || 0) + (b.views || 0) / 100 + (b.comments || 0) * 10
      return scoreB - scoreA
    })

    sorted[platform] = {
      ...result,
      posts: sortedPosts,
    }
  }

  return sorted
}
