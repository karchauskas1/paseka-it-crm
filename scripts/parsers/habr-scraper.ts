import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

/**
 * Хабр Scraper
 * IT-сообщество, разработчики, технологический бизнес
 * Идеально для B2B в сфере автоматизации
 */
export class HabrScraper extends BaseScraper {
  private baseUrl = 'https://habr.com'

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

      // Лучшее за день/неделю
      await this.page.goto(`${this.baseUrl}/ru/articles/top/daily/`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(2000)
      await this.scrollToBottom(this.config.maxPages)

      const articlesData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем статьи
        document.querySelectorAll('article, [class*="tm-articles-list__item"]').forEach((article) => {
          // Заголовок - ищем h2 с классом title
          const titleEl = article.querySelector('[class*="tm-title"], h2.tm-title, h2 a[href*="/articles/"]')
          if (!titleEl) return

          const title = titleEl.textContent?.trim()

          // Ссылка на статью
          const linkEl = titleEl.tagName === 'A' ? titleEl : titleEl.querySelector('a') || article.querySelector('a[href*="/articles/"]')
          const url = linkEl?.getAttribute('href')

          if (!title || !url || title.length < 10) return

          // Пропускаем ссылки на комментарии
          if (url.includes('/comments')) return

          // Пропускаем дубликаты
          const cleanUrl = url.split('#')[0].split('?')[0]
          if (processedUrls.has(cleanUrl)) return
          processedUrls.add(cleanUrl)

          // Автор
          const authorEl = article.querySelector('[class*="user-info"], [class*="tm-user-info"] a')
          const author = authorEl?.textContent?.trim() || ''

          // Статистика
          const statsText = article.textContent || ''

          // Просмотры (обычно "1.5K просмотров" или "15K")
          const viewsMatch = statsText.match(/([\d,.]+[KkКк]?)\s*просмотр/i) ||
                            statsText.match(/([\d,.]+[KkКк]?)\s*views/i)
          let views = 0
          if (viewsMatch) {
            const num = viewsMatch[1].replace(',', '.').toLowerCase()
            views = num.includes('k') || num.includes('к')
              ? parseFloat(num) * 1000
              : parseFloat(num)
          }

          // Рейтинг
          const ratingEl = article.querySelector('[class*="rating"], [class*="score"]')
          const ratingText = ratingEl?.textContent?.trim() || '0'
          const rating = parseInt(ratingText.replace(/[^\d-]/g, '')) || 0

          // Комментарии
          const commentsEl = article.querySelector('[class*="comments-count"], a[href*="#comments"]')
          const commentsText = commentsEl?.textContent?.trim() || '0'
          const comments = parseInt(commentsText.replace(/\D/g, '')) || 0

          // Хабы (теги)
          const hubs: string[] = []
          article.querySelectorAll('[class*="hub"], [class*="tm-article-snippet__hubs"] a').forEach((hub) => {
            const hubName = hub.textContent?.trim()
            if (hubName) hubs.push(hubName)
          })

          items.push({
            title,
            url: url.startsWith('http') ? url : `https://habr.com${url}`,
            author,
            views: Math.round(views),
            rating,
            comments,
            hubs,
          })
        })

        return items
      })

      console.log(`Найдено ${articlesData.length} статей на Хабре`)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(\d+)\//)
        posts.push({
          platform: 'habr',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author.replace('@', '') || 'unknown',
          authorDisplayName: data.author,
          url: data.url,
          likes: data.rating,
          comments: data.comments,
          views: data.views,
          category: data.hubs.join(', '),
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка Хабр: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'habr',
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

      // Поиск по Хабру
      const searchUrl = `${this.baseUrl}/ru/search/?q=${encodeURIComponent(query)}&target_type=posts&order=relevance`
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(2000)
      await this.scrollToBottom(this.config.maxPages)

      const articlesData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        document.querySelectorAll('[class*="tm-articles-list__item"], article').forEach((article) => {
          // Заголовок - ищем h2 с классом title
          const titleEl = article.querySelector('[class*="tm-title"], h2.tm-title, h2 a[href*="/articles/"]')
          if (!titleEl) return

          const title = titleEl.textContent?.trim()

          // Ссылка на статью
          const linkEl = titleEl.tagName === 'A' ? titleEl : titleEl.querySelector('a') || article.querySelector('a[href*="/articles/"]')
          const url = linkEl?.getAttribute('href')

          if (!title || !url || title.length < 10) return

          // Пропускаем ссылки на комментарии
          if (url.includes('/comments')) return

          // Пропускаем дубликаты
          const cleanUrl = url.split('#')[0].split('?')[0]
          if (processedUrls.has(cleanUrl)) return
          processedUrls.add(cleanUrl)

          const authorEl = article.querySelector('[class*="user-info"] a, [class*="tm-user-info"] a')
          const author = authorEl?.textContent?.trim() || ''

          const ratingEl = article.querySelector('[class*="rating"], [class*="score"]')
          const rating = parseInt(ratingEl?.textContent?.trim() || '0') || 0

          const commentsEl = article.querySelector('[class*="comments"]')
          const comments = parseInt(commentsEl?.textContent?.trim() || '0') || 0

          items.push({
            title,
            url: url.startsWith('http') ? url : `https://habr.com${url}`,
            author,
            rating,
            comments,
          })
        })

        return items
      })

      console.log(`Найдено ${articlesData.length} результатов на Хабре для "${query}"`)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(\d+)\//)
        posts.push({
          platform: 'habr',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author || 'unknown',
          url: data.url,
          likes: data.rating,
          comments: data.comments,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка поиска Хабр: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'habr',
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

      await this.page.goto(`${this.baseUrl}/ru/users/${username}/`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(2000)

      const profileData = await this.page.evaluate(() => {
        const displayName = document.querySelector('h1, [class*="page-title"]')?.textContent?.trim()
        const bio = document.querySelector('[class*="user-about"], [class*="tm-user-card__description"]')?.textContent?.trim()
        const avatarUrl = (document.querySelector('[class*="avatar"] img, [class*="tm-entity-image"] img') as HTMLImageElement)?.src

        // Карма и рейтинг
        const statsText = document.body.textContent || ''
        const karmaMatch = statsText.match(/Карма[:\s]*([\d,.+-]+)/i)
        const ratingMatch = statsText.match(/Рейтинг[:\s]*([\d,.+-]+)/i)
        const followersMatch = statsText.match(/([\d,]+)\s*подписчик/i)

        return {
          displayName,
          bio,
          avatarUrl,
          karma: karmaMatch ? karmaMatch[1] : undefined,
          rating: ratingMatch ? ratingMatch[1] : undefined,
          followers: followersMatch ? followersMatch[1].replace(/\D/g, '') : undefined,
        }
      })

      return {
        platform: 'habr',
        username,
        displayName: profileData.displayName || username,
        bio: profileData.bio,
        followers: profileData.followers ? parseInt(profileData.followers) : undefined,
        profileUrl: `${this.baseUrl}/ru/users/${username}/`,
        avatarUrl: profileData.avatarUrl,
        parsedAt: new Date(),
      }
    } catch (err) {
      console.error(`Ошибка профиля Хабр ${username}:`, err)
      return null
    } finally {
      await this.close()
    }
  }

  // Парсинг по хабу (тематике)
  async scrapeHub(hub: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Хабы: marketing, it-companies, management, etc.
      await this.page.goto(`${this.baseUrl}/ru/hub/${hub}/`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(2000)
      await this.scrollToBottom(this.config.maxPages)

      const articlesData = await this.page.evaluate((hubName) => {
        const items: any[] = []

        document.querySelectorAll('article, [class*="tm-articles-list__item"]').forEach((article) => {
          const titleLink = article.querySelector('a[href*="/articles/"], h2 a')
          if (!titleLink) return

          const title = titleLink.textContent?.trim()
          const url = titleLink.getAttribute('href')
          if (!title || !url) return

          const authorEl = article.querySelector('[class*="user-info"] a')
          const author = authorEl?.textContent?.trim() || ''

          items.push({
            title,
            url: url.startsWith('http') ? url : `https://habr.com${url}`,
            author,
            hub: hubName,
          })
        })

        return items
      }, hub)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/(\d+)\//)
        posts.push({
          platform: 'habr',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author || 'unknown',
          url: data.url,
          category: data.hub,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка хаба ${hub}: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'habr',
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
