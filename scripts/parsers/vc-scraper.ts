import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

export class VCScraper extends BaseScraper {
  private baseUrl = 'https://vc.ru'

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

      await this.page.goto(`${this.baseUrl}/popular`, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      // Парсим через evaluate для устойчивости к изменениям DOM
      const articlesData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем все ссылки на статьи (формат /12345-slug)
        document.querySelectorAll('a[href]').forEach((link) => {
          const href = link.getAttribute('href') || ''
          if (!href.match(/\/\d+-[a-z0-9-]+/i) || processedUrls.has(href)) return
          processedUrls.add(href)

          // Получаем текст ссылки как заголовок
          const linkText = link.textContent?.trim() || ''
          if (linkText.length < 15 || linkText.length > 300) return

          // Ищем контейнер статьи
          let container = link.parentElement
          for (let i = 0; i < 5 && container; i++) {
            if (container.querySelector('time') || container.textContent?.includes('комментар')) {
              break
            }
            container = container.parentElement
          }

          // Извлекаем метаданные
          const containerText = container?.textContent || ''

          // Автор — обычно перед датой или после
          let author = ''
          const authorMatch = containerText.match(/([А-Яа-яA-Za-z\s]{3,30})\s*·/)?.[1]?.trim()
          if (authorMatch && !authorMatch.includes('читать') && !authorMatch.includes('комментар')) {
            author = authorMatch
          }

          // Лайки
          const likesMatch = containerText.match(/([+-]?\d+)\s*$/m)
          const likes = likesMatch ? parseInt(likesMatch[1]) : 0

          // Комментарии
          const commentsMatch = containerText.match(/(\d+)\s*комментар/i)
          const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0

          items.push({
            title: linkText,
            url: href.startsWith('http') ? href : `https://vc.ru${href}`,
            author,
            likes,
            comments,
          })
        })

        return items
      })

      console.log(`Найдено ${articlesData.length} статей на VC.ru`)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(\d+)-/)
        posts.push({
          platform: 'vc',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author.replace('@', '') || 'unknown',
          authorDisplayName: data.author,
          url: data.url,
          likes: data.likes || undefined,
          comments: data.comments || undefined,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Критическая ошибка VC.ru: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'vc.ru',
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

      // VC.ru поиск - пробуем разные форматы URL
      const searchUrls = [
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&mode=entries`,
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}`,
      ]

      let loaded = false
      for (const searchUrl of searchUrls) {
        try {
          console.log(`Пробуем: ${searchUrl}`)
          await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
          await this.delay(3000)

          const hasResults = await this.page.evaluate(() => {
            return document.querySelectorAll('a[href*="/"]').length > 10
          })

          if (hasResults) {
            loaded = true
            break
          }
        } catch (e) {
          console.log(`Не удалось: ${searchUrl}`)
        }
      }

      if (loaded) {
        await this.scrollToBottom(this.config.maxPages)
      }

      const articlesData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем статьи - ссылки вида /123456-slug
        document.querySelectorAll('a[href]').forEach((link) => {
          const href = link.getAttribute('href') || ''
          if (!href.match(/\/\d+-[a-z0-9-]+/i)) return

          const cleanUrl = href.split('?')[0].split('#')[0]
          if (processedUrls.has(cleanUrl)) return
          processedUrls.add(cleanUrl)

          // Ищем заголовок - текст ссылки или h2/h3 внутри
          let title = ''
          const headingEl = link.querySelector('h2, h3, [class*="title"]')
          if (headingEl) {
            title = headingEl.textContent?.trim() || ''
          } else {
            title = link.textContent?.trim() || ''
          }

          if (title.length < 15 || title.length > 300) return

          items.push({
            title,
            url: href.startsWith('http') ? href : `https://vc.ru${href}`,
          })
        })

        return items
      })

      console.log(`Найдено ${articlesData.length} результатов для "${query}"`)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(\d+)-/)
        posts.push({
          platform: 'vc',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: 'unknown',
          url: data.url,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Критическая ошибка поиска VC.ru: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'vc.ru',
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

      await this.page.goto(`${this.baseUrl}/u/${username}`, { waitUntil: 'domcontentloaded' })
      await this.delay(2000)

      const profileData = await this.page.evaluate(() => {
        const displayName = document.querySelector('h1')?.textContent?.trim()
        const bio = document.querySelector('[class*="about"], [class*="description"]')?.textContent?.trim()
        const avatarUrl = (document.querySelector('img[src*="avatar"], img[src*="leonardo"]') as HTMLImageElement)?.src
        const followersText = document.body.textContent?.match(/(\d[\d\s]*)\s*подписчик/i)?.[1]

        return { displayName, bio, avatarUrl, followersText }
      })

      return {
        platform: 'vc',
        username,
        displayName: profileData.displayName || username,
        bio: profileData.bio,
        followers: this.parseNumber(profileData.followersText?.replace(/\s/g, '')),
        profileUrl: `${this.baseUrl}/u/${username}`,
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

  async scrapeCategory(category: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      await this.page.goto(`${this.baseUrl}/${category}`, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      const articlesData = await this.page.evaluate((cat) => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        document.querySelectorAll('a[href]').forEach((link) => {
          const href = link.getAttribute('href') || ''
          if (!href.match(/\/\d+-[a-z0-9-]+/i) || processedUrls.has(href)) return
          processedUrls.add(href)

          const linkText = link.textContent?.trim() || ''
          if (linkText.length < 15 || linkText.length > 300) return

          items.push({
            title: linkText,
            url: href.startsWith('http') ? href : `https://vc.ru${href}`,
            category: cat,
          })
        })

        return items
      }, category)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(\d+)-/)
        posts.push({
          platform: 'vc',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: 'unknown',
          url: data.url,
          category: data.category,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка категории ${category}: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'vc.ru',
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
