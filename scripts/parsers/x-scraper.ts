import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

/**
 * X/Twitter Scraper
 * Использует публичные Nitter-инстансы для обхода ограничений Twitter API
 *
 * Nitter — open-source frontend для Twitter без JS и трекинга
 * Список инстансов: https://github.com/zedeus/nitter/wiki/Instances
 */
export class XScraper extends BaseScraper {
  // Список рабочих Nitter-инстансов (обновлено 2026-01)
  // Актуальный список: https://status.d420.de/
  private nitterInstances = [
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
    'https://nitter.cz',
    'https://xcancel.com',
    'https://nitter.net',
    'https://nitter.1d4.us',
    'https://nitter.kavin.rocks',
  ]
  private currentInstance = 0

  constructor(config?: ParserConfig) {
    super(config)
  }

  private get baseUrl(): string {
    return this.nitterInstances[this.currentInstance]
  }

  private rotateInstance(): void {
    this.currentInstance = (this.currentInstance + 1) % this.nitterInstances.length
    console.log(`Переключение на инстанс: ${this.baseUrl}`)
  }

  async scrapePopular(): Promise<ParseResult> {
    // На Nitter нет "популярного", используем поиск по трендам
    return this.scrapeSearch('lang:ru')
  }

  async scrapeSearch(query: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const profiles: ParsedProfile[] = []
    const errors: string[] = []

    // Пробуем несколько инстансов
    for (let attempt = 0; attempt < this.nitterInstances.length; attempt++) {
      try {
        await this.init()
        if (!this.page) throw new Error('Page not initialized')

        const searchUrl = `${this.baseUrl}/search?f=tweets&q=${encodeURIComponent(query)}`
        console.log(`Поиск X: ${searchUrl}`)

        await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 })
        await this.delay()

        // Проверяем, загрузилась ли страница
        const error = await this.page.$('.error-panel, .error')
        if (error) {
          this.rotateInstance()
          await this.close()
          continue
        }

        await this.scrollToBottom(Math.min(this.config.maxPages || 3, 3))

        const tweets = await this.page.$$('.timeline-item, .tweet-body')
        console.log(`Найдено ${tweets.length} твитов для "${query}"`)

        for (const tweet of tweets.slice(0, this.config.maxPosts)) {
          try {
            const post = await this.parseTweet(tweet)
            if (post) {
              posts.push(post)
            }
          } catch (err) {
            errors.push(`Ошибка парсинга твита: ${err}`)
          }
        }

        // Успешно — выходим из цикла
        break
      } catch (err) {
        console.error(`Ошибка инстанса ${this.baseUrl}:`, err)
        this.rotateInstance()
        errors.push(`Инстанс ${this.baseUrl} недоступен`)
      } finally {
        await this.close()
      }
    }

    return {
      success: posts.length > 0,
      platform: 'x/twitter',
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
    for (let attempt = 0; attempt < this.nitterInstances.length; attempt++) {
      try {
        await this.init()
        if (!this.page) throw new Error('Page not initialized')

        await this.page.goto(`${this.baseUrl}/${username}`, {
          waitUntil: 'networkidle',
          timeout: 15000,
        })
        await this.delay()

        // Проверяем ошибку
        const error = await this.page.$('.error-panel')
        if (error) {
          this.rotateInstance()
          await this.close()
          continue
        }

        const displayName = await this.safeText('.profile-card-fullname, .fullname')
        const bio = await this.safeText('.profile-bio, .bio')
        const avatarUrl = await this.safeAttr('.profile-card-avatar img, .avatar img', 'src')

        // Статистика
        const stats = await this.page.$$('.profile-stat, .stat')
        let followers: number | undefined
        let following: number | undefined
        let postsCount: number | undefined

        for (const stat of stats) {
          const text = await stat.textContent()
          if (text?.toLowerCase().includes('follow')) {
            if (text.toLowerCase().includes('followers')) {
              followers = this.parseNumber(text)
            } else if (text.toLowerCase().includes('following')) {
              following = this.parseNumber(text)
            }
          } else if (text?.toLowerCase().includes('tweet') || text?.toLowerCase().includes('post')) {
            postsCount = this.parseNumber(text)
          }
        }

        // Сайт из био
        const websiteEl = await this.page.$('.profile-website a, .website a')
        const website = websiteEl ? await websiteEl.getAttribute('href') : undefined

        // Верификация
        const verified = !!(await this.page.$('.verified-icon, .icon-verified'))

        return {
          platform: 'x',
          username,
          displayName: displayName || username,
          bio,
          followers,
          following,
          postsCount,
          profileUrl: `https://x.com/${username}`,
          avatarUrl: avatarUrl ? `${this.baseUrl}${avatarUrl}` : undefined,
          isVerified: verified,
          website,
          parsedAt: new Date(),
        }
      } catch (err) {
        console.error(`Ошибка инстанса для профиля:`, err)
        this.rotateInstance()
      } finally {
        await this.close()
      }
    }

    return null
  }

  private async parseTweet(element: any): Promise<ParsedPost | null> {
    // Контент твита
    const contentEl = await element.$('.tweet-content, .content')
    const content = contentEl ? (await contentEl.textContent())?.trim() : undefined

    if (!content) return null

    // Автор
    const usernameEl = await element.$('.username, .tweet-header a')
    const authorUsername = usernameEl
      ? (await usernameEl.textContent())?.trim()?.replace('@', '')
      : 'unknown'

    const fullnameEl = await element.$('.fullname')
    const authorDisplayName = fullnameEl ? (await fullnameEl.textContent())?.trim() : undefined

    // Ссылка на твит
    const linkEl = await element.$('.tweet-link, a[href*="/status/"]')
    const link = linkEl ? await linkEl.getAttribute('href') : undefined
    const postIdMatch = link?.match(/status\/(\d+)/)
    const postId = postIdMatch ? postIdMatch[1] : `${Date.now()}`

    // Метрики
    const statsEls = await element.$$('.tweet-stat, .icon-container')
    let likes: number | undefined
    let reposts: number | undefined
    let comments: number | undefined

    for (const stat of statsEls) {
      const text = await stat.textContent()
      const iconHtml = await stat.innerHTML()

      if (iconHtml?.includes('heart') || iconHtml?.includes('like')) {
        likes = this.parseNumber(text)
      } else if (iconHtml?.includes('retweet') || iconHtml?.includes('repeat')) {
        reposts = this.parseNumber(text)
      } else if (iconHtml?.includes('comment') || iconHtml?.includes('reply')) {
        comments = this.parseNumber(text)
      }
    }

    // Дата
    const dateEl = await element.$('.tweet-date a, time')
    const dateStr = dateEl ? await dateEl.getAttribute('title') : undefined
    const publishedAt = dateStr ? new Date(dateStr) : undefined

    // Картинки
    const images: string[] = []
    const imageEls = await element.$$('.attachment img, .media img')
    for (const img of imageEls) {
      const src = await img.getAttribute('src')
      if (src) {
        images.push(src.startsWith('http') ? src : `${this.baseUrl}${src}`)
      }
    }

    return {
      platform: 'x',
      postId,
      content,
      authorUsername: authorUsername || 'unknown',
      authorDisplayName,
      url: `https://x.com/${authorUsername}/status/${postId}`,
      likes,
      reposts,
      comments,
      publishedAt,
      images,
      parsedAt: new Date(),
    }
  }

  // Парсинг твитов пользователя
  async scrapeUserTweets(username: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    for (let attempt = 0; attempt < this.nitterInstances.length; attempt++) {
      try {
        await this.init()
        if (!this.page) throw new Error('Page not initialized')

        await this.page.goto(`${this.baseUrl}/${username}`, {
          waitUntil: 'networkidle',
          timeout: 15000,
        })
        await this.delay()

        const error = await this.page.$('.error-panel')
        if (error) {
          this.rotateInstance()
          await this.close()
          continue
        }

        await this.scrollToBottom(this.config.maxPages)

        const tweets = await this.page.$$('.timeline-item, .tweet-body')

        for (const tweet of tweets.slice(0, this.config.maxPosts)) {
          try {
            const post = await this.parseTweet(tweet)
            if (post) {
              posts.push(post)
            }
          } catch (err) {
            errors.push(`Ошибка: ${err}`)
          }
        }

        break
      } catch (err) {
        this.rotateInstance()
        errors.push(`Ошибка: ${err}`)
      } finally {
        await this.close()
      }
    }

    return {
      success: posts.length > 0,
      platform: 'x/twitter',
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
