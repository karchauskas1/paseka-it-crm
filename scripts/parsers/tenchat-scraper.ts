import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

/**
 * TenChat Scraper
 * Российская социальная сеть для бизнеса и профессионалов
 * Аналог LinkedIn для РФ
 */
export class TenChatScraper extends BaseScraper {
  private baseUrl = 'https://tenchat.ru'

  constructor(config?: ParserConfig) {
    super(config)
  }

  async scrapePopular(): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Лента популярного
      await this.page.goto(`${this.baseUrl}/feed`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      const postsData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем посты в ленте
        document.querySelectorAll('[class*="post"], [class*="feed-item"], article').forEach((post) => {
          // Ссылка на пост
          const linkEl = post.querySelector('a[href*="/post/"], a[href*="/p/"]')
          if (!linkEl) return

          const url = (linkEl as HTMLAnchorElement).href
          if (processedUrls.has(url)) return
          processedUrls.add(url)

          // Контент поста
          const contentEl = post.querySelector('[class*="content"], [class*="text"], p')
          const content = contentEl?.textContent?.trim() || ''
          if (content.length < 20) return

          // Автор
          const authorEl = post.querySelector('[class*="author"], [class*="user-name"], [class*="name"]')
          const author = authorEl?.textContent?.trim() || ''

          // Лайки и комментарии
          const text = post.textContent || ''
          const likesMatch = text.match(/(\d+)\s*(лайк|like|♥|❤)/i)
          const likes = likesMatch ? parseInt(likesMatch[1]) : 0

          const commentsMatch = text.match(/(\d+)\s*(комментар|comment)/i)
          const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0

          items.push({
            content: content.slice(0, 500),
            url,
            author,
            likes,
            comments,
          })
        })

        return items
      })

      console.log(`Найдено ${postsData.length} постов на TenChat`)

      for (const data of postsData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(post|p)\/([^/?]+)/)
        posts.push({
          platform: 'tenchat',
          postId: postIdMatch ? postIdMatch[2] : data.url,
          content: data.content,
          authorUsername: data.author || 'unknown',
          authorDisplayName: data.author,
          url: data.url,
          likes: data.likes || undefined,
          comments: data.comments || undefined,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка TenChat: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'tenchat',
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

  async scrapeSearch(query: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Поиск через Google с site:tenchat.ru (TenChat может не иметь публичного поиска)
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' site:tenchat.ru')}`
      console.log(`Поиск TenChat через Google: ${searchUrl}`)
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)

      const postsData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем результаты Google
        document.querySelectorAll('a[href*="tenchat.ru"]').forEach((link) => {
          let url = (link as HTMLAnchorElement).href

          // Очищаем от Google редиректов
          if (url.includes('google.com/url')) {
            const match = url.match(/url=([^&]+)/)
            if (match) url = decodeURIComponent(match[1])
          }

          if (!url.includes('tenchat.ru')) return

          const cleanUrl = url.split('?')[0]
          if (processedUrls.has(cleanUrl)) return
          processedUrls.add(cleanUrl)

          // Заголовок из результата поиска
          let title = ''
          const parent = link.closest('[class*="g"]') || link.parentElement?.parentElement
          const heading = parent?.querySelector('h3')
          if (heading) {
            title = heading.textContent?.trim() || ''
          } else {
            title = link.textContent?.trim() || ''
          }

          if (!title || title.length < 15) return

          // Убираем название сайта из заголовка
          title = title.replace(/\s*[-–—]\s*(TenChat|Тенчат).*$/i, '').trim()

          items.push({
            content: title,
            url: cleanUrl,
          })
        })

        return items
      })

      console.log(`Найдено ${postsData.length} результатов TenChat для "${query}"`)

      for (const data of postsData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(post|p|user)\/([^/?]+)/)
        posts.push({
          platform: 'tenchat',
          postId: postIdMatch ? postIdMatch[2] : data.url,
          content: data.content,
          authorUsername: 'unknown',
          url: data.url,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка поиска TenChat: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'tenchat',
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

  async scrapeProfile(username: string): Promise<ParsedProfile | null> {
    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      await this.page.goto(`${this.baseUrl}/${username}`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(3000)

      const profileData = await this.page.evaluate(() => {
        const displayName = document.querySelector('h1, [class*="profile-name"], [class*="user-name"]')?.textContent?.trim()
        const bio = document.querySelector('[class*="bio"], [class*="about"], [class*="description"]')?.textContent?.trim()
        const avatarUrl = (document.querySelector('[class*="avatar"] img, [class*="profile-photo"] img') as HTMLImageElement)?.src

        const text = document.body.textContent || ''
        const followersMatch = text.match(/([\d,.\s]+)\s*(подписчик|follower)/i)
        const postsMatch = text.match(/([\d,.\s]+)\s*(публикац|post)/i)

        return {
          displayName,
          bio,
          avatarUrl,
          followers: followersMatch ? followersMatch[1].replace(/\D/g, '') : undefined,
          postsCount: postsMatch ? postsMatch[1].replace(/\D/g, '') : undefined,
        }
      })

      return {
        platform: 'tenchat',
        username,
        displayName: profileData.displayName || username,
        bio: profileData.bio,
        followers: profileData.followers ? parseInt(profileData.followers) : undefined,
        postsCount: profileData.postsCount ? parseInt(profileData.postsCount) : undefined,
        profileUrl: `${this.baseUrl}/${username}`,
        avatarUrl: profileData.avatarUrl,
        parsedAt: new Date(),
      }
    } catch (err) {
      console.error(`Ошибка профиля TenChat ${username}:`, err)
      return null
    } finally {
      await this.close()
    }
  }
}
