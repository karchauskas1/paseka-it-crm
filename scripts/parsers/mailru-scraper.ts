import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

/**
 * Ответы Mail.ru Scraper
 * Q&A платформа — люди задают вопросы о проблемах
 * Отличный источник для понимания болей аудитории
 */
export class MailRuScraper extends BaseScraper {
  private baseUrl = 'https://otvet.mail.ru'

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

      // Популярные вопросы - пробуем разные URL
      const urls = [
        `${this.baseUrl}/`,
        `${this.baseUrl}/hot/`,
        `${this.baseUrl}/bestquestions/`,
      ]

      let loaded = false
      for (const url of urls) {
        try {
          await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
          await this.delay(3000)

          // Проверяем, есть ли контент
          const hasQuestions = await this.page.evaluate(() => {
            return document.querySelectorAll('a[href*="/question/"]').length > 0
          })

          if (hasQuestions) {
            console.log(`Mail.ru загружен с: ${url}`)
            loaded = true
            break
          }
        } catch (e) {
          console.log(`Не удалось загрузить: ${url}`)
        }
      }

      if (!loaded) {
        throw new Error('Не удалось загрузить Mail.ru Ответы')
      }

      await this.scrollToBottom(this.config.maxPages)

      const questionsData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем все ссылки на вопросы
        document.querySelectorAll('a').forEach((link) => {
          const href = link.getAttribute('href') || ''
          // URL вопроса: /question/123456
          if (!href.match(/\/question\/\d+/) && !href.includes('otvet.mail.ru/question/')) return

          const url = href.startsWith('http') ? href : `https://otvet.mail.ru${href}`
          const cleanUrl = url.split('?')[0]
          if (processedUrls.has(cleanUrl)) return

          // Текст вопроса - должен быть достаточно длинным
          const title = link.textContent?.trim()
          if (!title || title.length < 15 || title.length > 500) return

          // Пропускаем навигационные ссылки
          if (title.includes('Ответы') && title.length < 20) return
          if (title.match(/^\d+$/)) return

          processedUrls.add(cleanUrl)

          // Ищем контейнер для статистики
          let container = link.parentElement
          for (let i = 0; i < 5 && container; i++) {
            if (container.textContent && container.textContent.includes('ответ')) break
            container = container.parentElement
          }

          const text = container?.textContent || ''

          const answersMatch = text.match(/(\d+)\s*ответ/i)
          const answers = answersMatch ? parseInt(answersMatch[1]) : 0

          items.push({
            title,
            url: cleanUrl,
            answers,
          })
        })

        return items
      })

      console.log(`Найдено ${questionsData.length} вопросов на Mail.ru`)

      const processedUrls = new Set<string>()
      for (const data of questionsData.slice(0, this.config.maxPosts * 2)) {
        if (processedUrls.has(data.url)) continue
        processedUrls.add(data.url)

        const postIdMatch = data.url.match(/\/question\/(\d+)/)
        posts.push({
          platform: 'mailru',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: 'unknown',
          url: data.url,
          comments: data.answers,
          views: data.views || undefined,
          category: data.category || undefined,
          parsedAt: new Date(),
        })

        if (posts.length >= (this.config.maxPosts || 50)) break
      }
    } catch (err) {
      errors.push(`Ошибка Mail.ru Ответы: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'mailru',
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

      // Поиск вопросов через Google с site:otvet.mail.ru
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' site:otvet.mail.ru')}`
      console.log(`Поиск Mail.ru через Google: ${searchUrl}`)
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(3000)

      const questionsData = await this.page.evaluate(() => {
        const items: any[] = []
        const processedUrls = new Set<string>()

        // Ищем результаты Google с ссылками на otvet.mail.ru
        document.querySelectorAll('a[href*="otvet.mail.ru/question/"]').forEach((link) => {
          let url = (link as HTMLAnchorElement).href

          // Очищаем от Google редиректов
          if (url.includes('google.com/url')) {
            const match = url.match(/url=([^&]+)/)
            if (match) url = decodeURIComponent(match[1])
          }

          if (!url.includes('/question/')) return

          const cleanUrl = url.split('?')[0]
          if (processedUrls.has(cleanUrl)) return
          processedUrls.add(cleanUrl)

          // Заголовок - текст ссылки или h3 в результате поиска
          let title = ''
          const parent = link.closest('[class*="g"]') || link.parentElement?.parentElement
          const heading = parent?.querySelector('h3')
          if (heading) {
            title = heading.textContent?.trim() || ''
          } else {
            title = link.textContent?.trim() || ''
          }

          if (!title || title.length < 15 || title.length > 500) return

          // Убираем "- Pair of Pandas" и подобное из конца
          title = title.replace(/\s*[-–—]\s*(Pair of Pandas|Pair of pandas|Pair-of-Pandas|otvet\.mail\.ru|Ответы Mail\.ru).*$/i, '').trim()

          items.push({
            title,
            url: cleanUrl,
            answers: 0,
          })
        })

        return items
      })

      console.log(`Найдено ${questionsData.length} вопросов на Mail.ru для "${query}"`)

      const processedUrls = new Set<string>()
      for (const data of questionsData.slice(0, this.config.maxPosts * 2)) {
        if (processedUrls.has(data.url)) continue
        processedUrls.add(data.url)

        const postIdMatch = data.url.match(/\/question\/(\d+)/)
        posts.push({
          platform: 'mailru',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: 'unknown',
          url: data.url,
          comments: data.answers,
          parsedAt: new Date(),
        })

        if (posts.length >= (this.config.maxPosts || 50)) break
      }
    } catch (err) {
      errors.push(`Ошибка поиска Mail.ru: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'mailru',
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

  async scrapeProfile(userId: string): Promise<ParsedProfile | null> {
    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      await this.page.goto(`${this.baseUrl}/profile/id${userId}/`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(2000)

      const profileData = await this.page.evaluate(() => {
        const displayName = document.querySelector('[class*="profile-name"], h1')?.textContent?.trim()
        const avatarUrl = (document.querySelector('[class*="avatar"] img') as HTMLImageElement)?.src

        const text = document.body.textContent || ''
        const questionsMatch = text.match(/(\d+)\s*вопрос/i)
        const answersMatch = text.match(/(\d+)\s*ответ/i)

        return {
          displayName,
          avatarUrl,
          questions: questionsMatch ? parseInt(questionsMatch[1]) : 0,
          answers: answersMatch ? parseInt(answersMatch[1]) : 0,
        }
      })

      return {
        platform: 'mailru',
        username: userId,
        displayName: profileData.displayName || userId,
        postsCount: profileData.questions + profileData.answers,
        profileUrl: `${this.baseUrl}/profile/id${userId}/`,
        avatarUrl: profileData.avatarUrl,
        parsedAt: new Date(),
      }
    } catch (err) {
      console.error(`Ошибка профиля Mail.ru ${userId}:`, err)
      return null
    } finally {
      await this.close()
    }
  }

  // Парсинг по категории
  async scrapeCategory(category: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Категории: biznes, rabota, kompyutery, etc.
      await this.page.goto(`${this.baseUrl}/questions/${category}/`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(2000)
      await this.scrollToBottom(this.config.maxPages)

      const questionsData = await this.page.evaluate((cat) => {
        const items: any[] = []

        document.querySelectorAll('a[href*="/question/"]').forEach((link) => {
          const url = (link as HTMLAnchorElement).href
          if (!url.includes('/question/')) return

          const title = link.textContent?.trim()
          if (!title || title.length < 10) return

          items.push({
            title,
            url,
            category: cat,
          })
        })

        return items
      }, category)

      const processedUrls = new Set<string>()
      for (const data of questionsData.slice(0, this.config.maxPosts * 2)) {
        if (processedUrls.has(data.url)) continue
        processedUrls.add(data.url)

        const postIdMatch = data.url.match(/\/question\/(\d+)/)
        posts.push({
          platform: 'mailru',
          postId: postIdMatch ? postIdMatch[1] : data.url,
          title: data.title,
          content: data.title,
          authorUsername: 'unknown',
          url: data.url,
          category: data.category,
          parsedAt: new Date(),
        })

        if (posts.length >= (this.config.maxPosts || 50)) break
      }
    } catch (err) {
      errors.push(`Ошибка категории Mail.ru ${category}: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'mailru',
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
