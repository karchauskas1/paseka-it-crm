import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

/**
 * Threads Scraper
 *
 * Threads (от Meta) имеет ограниченную публичную доступность.
 * Парсим через веб-версию threads.net
 *
 * Ограничения:
 * - Нет поиска без авторизации
 * - Можно парсить только публичные профили
 * - Meta активно блокирует ботов
 */
export class ThreadsScraper extends BaseScraper {
  private baseUrl = 'https://www.threads.net'

  constructor(config?: ParserConfig) {
    super({
      ...config,
      delay: 2000, // Увеличенная задержка для Threads
    })
  }

  async scrapePopular(): Promise<ParseResult> {
    // Threads не имеет публичной ленты без авторизации
    return {
      success: false,
      platform: 'threads',
      profiles: [],
      posts: [],
      errors: ['Threads требует авторизации для просмотра ленты. Используйте scrapeProfile для конкретных профилей.'],
      stats: {
        profilesFound: 0,
        postsFound: 0,
        duration: 0,
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

      // Поиск через Google с site:threads.net
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' site:threads.net')}`
      console.log(`Поиск Threads через Google: ${searchUrl}`)
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)

      const postsData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем результаты Google
        document.querySelectorAll('a[href*="threads.net"]').forEach((link) => {
          let url = (link as HTMLAnchorElement).href

          // Очищаем от Google редиректов
          if (url.includes('google.com/url')) {
            const match = url.match(/url=([^&]+)/)
            if (match) url = decodeURIComponent(match[1])
          }

          if (!url.includes('threads.net')) return

          const cleanUrl = url.split('?')[0]
          if (processedUrls.has(cleanUrl)) return
          processedUrls.add(cleanUrl)

          // Извлекаем username из URL
          const usernameMatch = url.match(/threads\.net\/@([^/?]+)/)
          const username = usernameMatch ? usernameMatch[1] : 'unknown'

          // Заголовок из результата поиска
          let content = ''
          const parent = link.closest('[class*="g"]') || link.parentElement?.parentElement
          const heading = parent?.querySelector('h3')
          if (heading) {
            content = heading.textContent?.trim() || ''
          }
          // Также берём описание
          const desc = parent?.querySelector('[class*="VwiC3b"], [data-sncf]')
          if (desc) {
            content = desc.textContent?.trim() || content
          }

          if (!content || content.length < 15) return

          items.push({
            content,
            url: cleanUrl,
            username,
          })
        })

        return items
      })

      console.log(`Найдено ${postsData.length} результатов Threads для "${query}"`)

      for (const data of postsData.slice(0, this.config.maxPosts)) {
        const postIdMatch = data.url.match(/\/post\/([^/?]+)/)
        posts.push({
          platform: 'threads',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          content: data.content,
          authorUsername: data.username,
          url: data.url,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка поиска Threads: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'threads',
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

      // Убираем @ если есть
      const cleanUsername = username.replace('@', '')

      console.log(`Парсинг Threads профиля: @${cleanUsername}`)
      await this.page.goto(`${this.baseUrl}/@${cleanUsername}`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      })
      await this.delay(3000) // Threads медленно загружается

      // Проверяем, что профиль существует
      const notFound = await this.page.$('text="Sorry, this page isn\'t available"')
      if (notFound) {
        console.log(`Профиль @${cleanUsername} не найден`)
        return null
      }

      // Ждём загрузки контента
      await this.page.waitForSelector('[data-pressable-container="true"], .x1lliihq', {
        timeout: 10000,
      }).catch(() => null)

      // Имя пользователя
      const displayName = await this.page.evaluate(() => {
        // Threads использует сложную структуру классов
        const nameEl = document.querySelector('h1, [role="heading"]')
        return nameEl?.textContent?.trim()
      })

      // Био
      const bio = await this.page.evaluate(() => {
        // Обычно био находится после имени
        const bioEls = document.querySelectorAll('span.x1lliihq')
        for (const el of bioEls) {
          const text = el.textContent?.trim()
          if (text && text.length > 20 && !text.includes('followers')) {
            return text
          }
        }
        return undefined
      })

      // Статистика (followers)
      const stats = await this.page.evaluate(() => {
        const text = document.body.innerText
        const followersMatch = text.match(/([\d,.]+[KMБ]?)\s*followers/i)
        return {
          followers: followersMatch ? followersMatch[1] : undefined,
        }
      })

      const followers = this.parseNumber(stats.followers)

      // Аватар
      const avatarUrl = await this.page.evaluate(() => {
        const img = document.querySelector('img[alt*="profile"], img[src*="instagram"]')
        return img?.getAttribute('src')
      })

      // Верификация (синяя галочка)
      const isVerified = await this.page.evaluate(() => {
        return !!document.querySelector('[aria-label*="Verified"], svg[aria-label*="verified"]')
      })

      return {
        platform: 'threads',
        username: cleanUsername,
        displayName: displayName || cleanUsername,
        bio,
        followers,
        profileUrl: `${this.baseUrl}/@${cleanUsername}`,
        avatarUrl,
        isVerified,
        parsedAt: new Date(),
      }
    } catch (err) {
      console.error(`Ошибка парсинга Threads профиля ${username}:`, err)
      return null
    } finally {
      await this.close()
    }
  }

  // Парсинг постов конкретного пользователя
  async scrapeUserPosts(username: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      const cleanUsername = username.replace('@', '')

      await this.page.goto(`${this.baseUrl}/@${cleanUsername}`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      })
      await this.delay(3000)

      // Скроллим для загрузки постов
      await this.scrollToBottom(this.config.maxPages)

      // Парсим посты
      const postElements = await this.page.$$('[data-pressable-container="true"]')
      console.log(`Найдено ${postElements.length} элементов на странице Threads`)

      for (const postEl of postElements.slice(0, this.config.maxPosts)) {
        try {
          const post = await this.parsePost(postEl, cleanUsername)
          if (post && post.content) {
            posts.push(post)
          }
        } catch (err) {
          // Пропускаем ошибки отдельных постов
        }
      }
    } catch (err) {
      errors.push(`Ошибка парсинга постов Threads: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'threads',
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

  private async parsePost(element: any, authorUsername: string): Promise<ParsedPost | null> {
    try {
      // Контент поста
      const content = await element.evaluate((el: Element) => {
        const textEls = el.querySelectorAll('span')
        let longestText = ''
        for (const span of textEls) {
          const text = span.textContent?.trim() || ''
          if (text.length > longestText.length && !text.includes('like') && !text.includes('repl')) {
            longestText = text
          }
        }
        return longestText
      })

      if (!content || content.length < 5) return null

      // Время публикации
      const timeText = await element.evaluate((el: Element) => {
        const timeEl = el.querySelector('time, [datetime]')
        return timeEl?.getAttribute('datetime') || timeEl?.textContent
      })

      // Лайки
      const likesText = await element.evaluate((el: Element) => {
        const text = el.textContent || ''
        const match = text.match(/([\d,.]+)\s*like/i)
        return match ? match[1] : undefined
      })

      // Ссылка на пост
      const postUrl = await element.evaluate((el: Element) => {
        const link = el.querySelector('a[href*="/post/"]')
        return link?.getAttribute('href')
      })

      const postId = postUrl?.match(/post\/([^/?]+)/)?.[1] || `${Date.now()}`

      return {
        platform: 'threads',
        postId,
        content,
        authorUsername,
        url: postUrl ? `${this.baseUrl}${postUrl}` : `${this.baseUrl}/@${authorUsername}`,
        likes: this.parseNumber(likesText),
        publishedAt: timeText ? new Date(timeText) : undefined,
        parsedAt: new Date(),
      }
    } catch {
      return null
    }
  }

  // Метод для парсинга нескольких профилей
  async scrapeMultipleProfiles(usernames: string[]): Promise<ParsedProfile[]> {
    const profiles: ParsedProfile[] = []

    for (const username of usernames) {
      const profile = await this.scrapeProfile(username)
      if (profile) {
        profiles.push(profile)
      }
      await this.delay(3000) // Большая задержка между запросами
    }

    return profiles
  }
}
