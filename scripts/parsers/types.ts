// Типы данных для парсеров

export interface ParsedProfile {
  platform: 'vc' | 'threads' | 'x' | 'pikabu'
  username: string
  displayName: string
  bio?: string
  followers?: number
  following?: number
  postsCount?: number
  profileUrl: string
  avatarUrl?: string
  isVerified?: boolean
  // Контактные данные (если есть)
  website?: string
  email?: string
  telegram?: string
  // Метаданные
  parsedAt: Date
}

export interface ParsedPost {
  platform: 'vc' | 'threads' | 'x' | 'pikabu'
  postId: string
  authorUsername: string
  authorDisplayName?: string
  content: string
  url: string
  publishedAt?: Date
  likes?: number
  comments?: number
  reposts?: number
  views?: number
  // Для VC.ru
  title?: string
  category?: string
  readTime?: number
  // Медиа
  images?: string[]
  // Метаданные
  parsedAt: Date
}

export interface ParseResult {
  success: boolean
  platform: string
  profiles: ParsedProfile[]
  posts: ParsedPost[]
  errors: string[]
  stats: {
    profilesFound: number
    postsFound: number
    duration: number
  }
}

export interface ParserConfig {
  headless?: boolean
  timeout?: number
  maxPages?: number
  maxPosts?: number
  delay?: number // задержка между запросами (мс)
  proxy?: string
}

export type SearchQuery = {
  keywords?: string[]
  industry?: string
  location?: string
  minFollowers?: number
  maxFollowers?: number
}
