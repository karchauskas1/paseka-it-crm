import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

/**
 * Яндекс.Дзен Scraper
 * Большая аудитория, бизнес-контент, истории успеха/неудач
 */
export class ZenScraper extends BaseScraper {
  private baseUrl = 'https://dzen.ru'

  constructor(config?: ParserConfig) {
    super({
      ...config,
      delay: 2000, // Дзен медленный
    })
  }

  async scrapePopular(): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Главная лента или категория
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      const articlesData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем все ссылки на статьи
        document.querySelectorAll('a[href*="/a/"]').forEach((link) => {
          const url = (link as HTMLAnchorElement).href
          if (!url || !url.includes('/a/') || processedUrls.has(url)) return

          // Получаем текст ссылки и очищаем от статистики
          let fullText = link.textContent?.trim() || ''
          if (!fullText) return

          // Убираем статистику (читали, просмотров, даты)
          // Пример: "Motor.ru7180 читали · 1 день назад Заголовок статьи тут"
          // Нужно извлечь "Заголовок статьи тут"

          // Разбиваем по паттернам статистики
          let title = fullText
            .replace(/^\s*[\w\s\.\-]+\d+[\d,\s]*\s*(тыс|читали|просмотр|подписчик)[^\n]*/gi, '') // Автор + статистика
            .replace(/\d+\s*(читали|просмотр|день|час|минут)[^\n]*/gi, '') // Оставшаяся статистика
            .replace(/Подписаться/gi, '')
            .replace(/·/g, '')
            .trim()

          // Если после очистки ничего не осталось, берём как есть но короче
          if (title.length < 15) {
            // Берём текст после первого переноса строки или после статистики
            const parts = fullText.split(/\n/)
            if (parts.length > 1) {
              title = parts.find(p => p.trim().length > 20) || parts[parts.length - 1]
            } else {
              title = fullText.slice(0, 200)
            }
          }

          title = title.trim()
          if (!title || title.length < 15 || title.length > 300) return

          processedUrls.add(url)

          // Автор - первая часть текста до статистики
          let author = ''
          const authorMatch = fullText.match(/^([А-Яа-яA-Za-z\s\.\-]+?)(?:\d|тыс|читали)/i)
          if (authorMatch) {
            author = authorMatch[1].trim()
          }

          // Просмотры и лайки из текста
          const viewsMatch = fullText.match(/([\d,.\s]+[КкKkМм]?)\s*просмотр/i)
          let views = 0
          if (viewsMatch) {
            const num = viewsMatch[1].replace(/[\s,]/g, '').toLowerCase()
            if (num.includes('к') || num.includes('k')) views = parseFloat(num) * 1000
            else if (num.includes('м') || num.includes('m')) views = parseFloat(num) * 1000000
            else views = parseFloat(num)
          }

          const likesMatch = fullText.match(/([\d,]+)\s*лайк/i) || fullText.match(/👍\s*([\d,]+)/i)
          const likes = likesMatch ? parseInt(likesMatch[1].replace(/\D/g, '')) : 0

          items.push({
            title,
            url,
            author,
            views: Math.round(views),
            likes,
          })
        })

        return items
      })

      console.log(`Найдено ${articlesData.length} статей на Дзене`)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/a\/([^/?]+)/)
        posts.push({
          platform: 'zen',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author || 'unknown',
          authorDisplayName: data.author,
          url: data.url,
          likes: data.likes || undefined,
          views: data.views || undefined,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка Яндекс.Дзен: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'zen',
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

      // Поиск через Яндекс с фильтром site:dzen.ru
      const searchUrl = `https://yandex.ru/search/?text=${encodeURIComponent(query + ' site:dzen.ru')}`
      console.log(`Поиск Дзен через Яндекс: ${searchUrl}`)
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)
      await this.scrollToBottom(Math.min(this.config.maxPages || 3, 2))

      const articlesData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем результаты поиска Яндекса
        document.querySelectorAll('a[href*="dzen.ru/a/"], a[href*="zen.yandex.ru/media/"]').forEach((link) => {
          const url = (link as HTMLAnchorElement).href
          if (!url || processedUrls.has(url)) return

          // Очищаем URL от редиректов Яндекса
          let cleanUrl = url
          if (url.includes('yandex.ru/clck')) {
            const match = url.match(/url=([^&]+)/)
            if (match) cleanUrl = decodeURIComponent(match[1])
          }

          const baseUrl = cleanUrl.split('?')[0]
          if (processedUrls.has(baseUrl)) return
          processedUrls.add(baseUrl)

          // Заголовок - текст ссылки или родительского элемента
          let title = link.textContent?.trim() || ''

          // Если короткий, ищем в родителе
          if (title.length < 20) {
            const parent = link.closest('[class*="organic"]') || link.parentElement?.parentElement
            const heading = parent?.querySelector('h2, h3, [class*="title"]')
            if (heading) title = heading.textContent?.trim() || title
          }

          if (!title || title.length < 15 || title.length > 300) return

          items.push({
            title,
            url: baseUrl,
          })
        })

        return items
      })

      console.log(`Найдено ${articlesData.length} результатов на Дзене для "${query}"`)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/a\/([^/?]+)/)
        posts.push({
          platform: 'zen',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: data.author || 'unknown',
          url: data.url,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка поиска Дзен: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'zen',
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

  async scrapeProfile(channelId: string): Promise<ParsedProfile | null> {
    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Канал на Дзене
      await this.page.goto(`${this.baseUrl}/${channelId}`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(3000)

      const profileData = await this.page.evaluate(() => {
        const displayName = document.querySelector('h1, [class*="channel-name"], [class*="title"]')?.textContent?.trim()
        const bio = document.querySelector('[class*="description"], [class*="about"]')?.textContent?.trim()
        const avatarUrl = (document.querySelector('[class*="avatar"] img, [class*="channel-logo"] img') as HTMLImageElement)?.src

        const text = document.body.textContent || ''
        const subscribersMatch = text.match(/([\d,.\s]+[КкМм]?)\s*подписчик/i)
        let subscribers = undefined
        if (subscribersMatch) {
          const num = subscribersMatch[1].replace(/[\s,]/g, '').toLowerCase()
          if (num.includes('к') || num.includes('k')) subscribers = parseFloat(num) * 1000
          else if (num.includes('м') || num.includes('m')) subscribers = parseFloat(num) * 1000000
          else subscribers = parseFloat(num)
        }

        return { displayName, bio, avatarUrl, subscribers: subscribers ? Math.round(subscribers) : undefined }
      })

      return {
        platform: 'zen',
        username: channelId,
        displayName: profileData.displayName || channelId,
        bio: profileData.bio,
        followers: profileData.subscribers,
        profileUrl: `${this.baseUrl}/${channelId}`,
        avatarUrl: profileData.avatarUrl,
        parsedAt: new Date(),
      }
    } catch (err) {
      console.error(`Ошибка профиля Дзен ${channelId}:`, err)
      return null
    } finally {
      await this.close()
    }
  }

  // Парсинг категории
  async scrapeCategory(category: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Категории: business, technology, marketing, etc.
      await this.page.goto(`${this.baseUrl}/category/${category}`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(3000)
      await this.scrollToBottom(this.config.maxPages)

      const articlesData = await this.page.evaluate((cat) => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        document.querySelectorAll('a[href*="/a/"]').forEach((link) => {
          const url = (link as HTMLAnchorElement).href
          if (!url || processedUrls.has(url)) return
          processedUrls.add(url)

          const title = link.textContent?.trim()
          if (!title || title.length < 15 || title.length > 300) return

          items.push({
            title,
            url,
            category: cat,
          })
        })

        return items
      }, category)

      for (const data of articlesData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/a\/([^/?]+)/)
        posts.push({
          platform: 'zen',
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
      errors.push(`Ошибка категории Дзен ${category}: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'zen',
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
