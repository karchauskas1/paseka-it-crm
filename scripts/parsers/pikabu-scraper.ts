import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

export class PikabuScraper extends BaseScraper {
  private baseUrl = 'https://pikabu.ru'

  constructor(config?: ParserConfig) {
    super(config)
  }

  async scrapePopular(): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const profiles: ParsedProfile[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      await this.page.goto(`${this.baseUrl}/hot`, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      const postsData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем все ссылки на посты (формат /story/название_12345)
        document.querySelectorAll('a[href*="/story/"]').forEach((link) => {
          const href = link.getAttribute('href') || ''
          if (processedUrls.has(href) || !href.includes('_')) return
          processedUrls.add(href)

          const linkText = link.textContent?.trim() || ''
          if (linkText.length < 10 || linkText.length > 500) return

          // Ищем контейнер поста
          let container = link.closest('article') || link.parentElement
          for (let i = 0; i < 5 && container; i++) {
            if (container.tagName === 'ARTICLE' || container.classList.contains('story')) break
            container = container.parentElement
          }

          const containerText = container?.textContent || ''

          // Автор
          const authorMatch = containerText.match(/@([A-Za-z0-9_]+)/)
          const author = authorMatch ? authorMatch[1] : ''

          // Рейтинг
          const ratingMatch = containerText.match(/([+-]?\d+)\s*$/m) ||
                              containerText.match(/(\d+)\s*рейтинг/i)
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0

          // Комментарии
          const commentsMatch = containerText.match(/(\d+)\s*комментар/i)
          const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0

          items.push({
            title: linkText,
            url: href.startsWith('http') ? href : `https://pikabu.ru${href}`,
            author,
            rating,
            comments,
          })
        })

        return items
      })

      console.log(`Найдено ${postsData.length} постов на Pikabu`)

      for (const data of postsData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/_(\d+)$/)
        posts.push({
          platform: 'pikabu',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author || 'unknown',
          url: data.url,
          likes: data.rating || undefined,
          comments: data.comments || undefined,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Критическая ошибка Pikabu: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'pikabu',
      profiles,
      posts,
      errors,
      stats: {
        profilesFound: profiles.length,
        postsFound: posts.length,
        duration: Date.now() - startTime,
      },
    }
  }

  async scrapeSearch(query: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const profiles: ParsedProfile[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      const postsData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        document.querySelectorAll('a[href*="/story/"]').forEach((link) => {
          const href = link.getAttribute('href') || ''
          if (processedUrls.has(href) || !href.includes('_')) return
          processedUrls.add(href)

          const linkText = link.textContent?.trim() || ''
          if (linkText.length < 10 || linkText.length > 500) return

          // Ищем контейнер поста для метрик
          let container = link.closest('article') || link.parentElement
          for (let i = 0; i < 5 && container; i++) {
            if (container.tagName === 'ARTICLE' || container.classList.contains('story')) break
            container = container.parentElement
          }

          const containerText = container?.textContent || ''

          // Автор
          const authorMatch = containerText.match(/@([A-Za-z0-9_]+)/)
          const author = authorMatch ? authorMatch[1] : ''

          // Рейтинг (лайки)
          const ratingMatch = containerText.match(/([+-]?\d+)\s*$/m) ||
                              containerText.match(/(\d+)\s*рейтинг/i)
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0

          // Комментарии
          const commentsMatch = containerText.match(/(\d+)\s*комментар/i)
          const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0

          items.push({
            title: linkText,
            url: href.startsWith('http') ? href : `https://pikabu.ru${href}`,
            author,
            rating,
            comments,
          })
        })

        return items
      })

      console.log(`Найдено ${postsData.length} результатов для "${query}"`)

      for (const data of postsData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/_(\d+)$/)
        posts.push({
          platform: 'pikabu',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author || 'unknown',
          url: data.url,
          likes: data.rating || undefined,
          comments: data.comments || undefined,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Критическая ошибка поиска Pikabu: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'pikabu',
      profiles,
      posts,
      errors,
      stats: {
        profilesFound: profiles.length,
        postsFound: posts.length,
        duration: Date.now() - startTime,
      },
    }
  }

  async scrapeProfile(username: string): Promise<ParsedProfile | null> {
    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      await this.page.goto(`${this.baseUrl}/@${username}`, { waitUntil: 'domcontentloaded' })
      await this.delay(2000)

      const profileData = await this.page.evaluate(() => {
        const displayName = document.querySelector('h1, [class*="nick"]')?.textContent?.trim()
        const bio = document.querySelector('[class*="about"], [class*="description"]')?.textContent?.trim()
        const avatarUrl = (document.querySelector('[class*="avatar"] img, img[src*="avatar"]') as HTMLImageElement)?.src
        const ratingText = document.body.textContent?.match(/([\d\s]+)\s*рейтинг/i)?.[1]
        const subscribersText = document.body.textContent?.match(/([\d\s]+)\s*подписчик/i)?.[1]

        return { displayName, bio, avatarUrl, ratingText, subscribersText }
      })

      return {
        platform: 'pikabu',
        username,
        displayName: profileData.displayName || username,
        bio: profileData.bio,
        followers: this.parseNumber(profileData.subscribersText?.replace(/\s/g, '')),
        profileUrl: `${this.baseUrl}/@${username}`,
        avatarUrl: profileData.avatarUrl,
        parsedAt: new Date(),
      }
    } catch (err) {
      console.error(`Ошибка парсинга профиля ${username}:`, err)
      return null
    } finally {
      await this.close()
    }
  }

  async scrapeTag(tag: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      await this.page.goto(`${this.baseUrl}/tag/${encodeURIComponent(tag)}`, {
        waitUntil: 'domcontentloaded',
      })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      const postsData = await this.page.evaluate((tagName) => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        document.querySelectorAll('a[href*="/story/"]').forEach((link) => {
          const href = link.getAttribute('href') || ''
          if (processedUrls.has(href) || !href.includes('_')) return
          processedUrls.add(href)

          const linkText = link.textContent?.trim() || ''
          if (linkText.length < 10 || linkText.length > 500) return

          items.push({
            title: linkText,
            url: href.startsWith('http') ? href : `https://pikabu.ru${href}`,
            tag: tagName,
          })
        })

        return items
      }, tag)

      for (const data of postsData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/_(\d+)$/)
        posts.push({
          platform: 'pikabu',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: 'unknown',
          url: data.url,
          category: data.tag,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка тега ${tag}: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'pikabu',
      profiles: [],
      posts,
      errors,
      stats: {
        profilesFound: 0,
        postsFound: posts.length,
        duration: Date.now() - startTime,
      },
    }
  }
}
