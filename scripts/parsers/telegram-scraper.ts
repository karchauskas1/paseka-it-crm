import { BaseScraper } from './base-scraper'
import { ParsedProfile, ParsedPost, ParseResult, ParserConfig } from './types'

/**
 * Telegram Public Channels Scraper
 * Использует t.me/s/ (публичный веб-превью каналов)
 * Можно парсить только публичные каналы
 */
export class TelegramScraper extends BaseScraper {
  private baseUrl = 'https://t.me/s'

  constructor(config?: ParserConfig) {
    super(config)
  }

  async scrapePopular(): Promise<ParseResult> {
    // Для Telegram нет "популярного" — нужно знать конкретный канал
    return {
      success: false,
      platform: 'telegram',
      profiles: [],
      posts: [],
      errors: ['Telegram требует указания конкретного канала. Используйте scrapeChannel("channelname")'],
      stats: { profilesFound: 0, postsFound: 0, duration: 0 },
    }
  }

  async scrapeSearch(query: string): Promise<ParseResult> {
    // Поиск по Telegram каналам через tgstat или похожие сервисы
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Поиск каналов через tgstat.ru
      const searchUrl = `https://tgstat.ru/search?q=${encodeURIComponent(query)}`
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
      await this.delay(2000)

      const channelsData = await this.page.evaluate(() => {
        const items: any[] = []

        document.querySelectorAll('[class*="channel-card"], [class*="search-result"]').forEach((el) => {
          const linkEl = el.querySelector('a[href*="t.me/"]')
          const url = linkEl?.getAttribute('href')
          if (!url) return

          const title = el.querySelector('[class*="name"], h3, h4')?.textContent?.trim()
          const description = el.querySelector('[class*="description"], [class*="about"]')?.textContent?.trim()

          const subscribersText = el.textContent || ''
          const subsMatch = subscribersText.match(/([\d,.\s]+[КкМм]?)\s*подписчик/i)
          let subscribers = 0
          if (subsMatch) {
            const num = subsMatch[1].replace(/[\s,]/g, '').toLowerCase()
            if (num.includes('к') || num.includes('k')) subscribers = parseFloat(num) * 1000
            else if (num.includes('м') || num.includes('m')) subscribers = parseFloat(num) * 1000000
            else subscribers = parseFloat(num)
          }

          // Извлекаем username канала
          const usernameMatch = url.match(/t\.me\/([^/?]+)/)
          const username = usernameMatch ? usernameMatch[1] : ''

          if (username) {
            items.push({
              title: title || username,
              description,
              username,
              url: `https://t.me/${username}`,
              subscribers: Math.round(subscribers),
            })
          }
        })

        return items
      })

      console.log(`Найдено ${channelsData.length} каналов Telegram для "${query}"`)

      // Преобразуем каналы в "посты" для совместимости
      for (const data of channelsData.slice(0, this.config.maxPosts)) {
        posts.push({
          platform: 'telegram',
          postId: data.username,
          title: data.title,
          content: data.description || data.title,
          authorUsername: data.username,
          authorDisplayName: data.title,
          url: data.url,
          views: data.subscribers, // Используем subscribers как views
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка поиска Telegram: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'telegram',
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

  async scrapeProfile(channelUsername: string): Promise<ParsedProfile | null> {
    return this.scrapeChannelInfo(channelUsername)
  }

  // Парсинг публичного канала
  async scrapeChannel(channelUsername: string): Promise<ParseResult> {
    const startTime = Date.now()
    const posts: ParsedPost[] = []
    const errors: string[] = []

    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      // Публичный превью канала
      await this.page.goto(`${this.baseUrl}/${channelUsername}`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(2000)
      await this.scrollToBottom(this.config.maxPages)

      const postsData = await this.page.evaluate((channel) => {
        const items: any[] = []

        // Сообщения канала
        document.querySelectorAll('.tgme_widget_message, [class*="message"]').forEach((msg) => {
          // Текст сообщения
          const textEl = msg.querySelector('.tgme_widget_message_text, [class*="message-text"]')
          const content = textEl?.textContent?.trim()
          if (!content || content.length < 10) return

          // Ссылка на пост
          const linkEl = msg.querySelector('a[href*="/s/"][href*="?"]') ||
                        msg.querySelector('.tgme_widget_message_date')
          const url = linkEl?.getAttribute('href')

          // Просмотры
          const viewsEl = msg.querySelector('.tgme_widget_message_views, [class*="views"]')
          const viewsText = viewsEl?.textContent?.trim() || '0'
          let views = 0
          if (viewsText.includes('K') || viewsText.includes('К')) {
            views = parseFloat(viewsText) * 1000
          } else if (viewsText.includes('M') || viewsText.includes('М')) {
            views = parseFloat(viewsText) * 1000000
          } else {
            views = parseInt(viewsText.replace(/\D/g, '')) || 0
          }

          // Дата
          const dateEl = msg.querySelector('time, .tgme_widget_message_date')
          const datetime = dateEl?.getAttribute('datetime')

          // ID поста из URL
          const postIdMatch = url?.match(/\/(\d+)/)
          const postId = postIdMatch ? postIdMatch[1] : `${Date.now()}`

          items.push({
            content: content.slice(0, 500),
            url: url ? `https://t.me/${channel}/${postId}` : `https://t.me/${channel}`,
            views: Math.round(views),
            datetime,
            postId,
          })
        })

        return items
      }, channelUsername)

      console.log(`Найдено ${postsData.length} постов в канале @${channelUsername}`)

      for (const data of postsData.slice(0, this.config.maxPosts)) {
        posts.push({
          platform: 'telegram',
          postId: data.postId,
          content: data.content,
          authorUsername: channelUsername,
          url: data.url,
          views: data.views || undefined,
          publishedAt: data.datetime ? new Date(data.datetime) : undefined,
          parsedAt: new Date(),
        })
      }
    } catch (err) {
      errors.push(`Ошибка канала @${channelUsername}: ${err}`)
    } finally {
      await this.close()
    }

    return {
      success: posts.length > 0,
      platform: 'telegram',
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

  // Информация о канале
  async scrapeChannelInfo(channelUsername: string): Promise<ParsedProfile | null> {
    try {
      await this.init()
      if (!this.page) throw new Error('Page not initialized')

      await this.page.goto(`${this.baseUrl}/${channelUsername}`, {
        waitUntil: 'domcontentloaded'
      })
      await this.delay(2000)

      const profileData = await this.page.evaluate(() => {
        const displayName = document.querySelector('.tgme_channel_info_header_title, [class*="channel-title"]')?.textContent?.trim()
        const bio = document.querySelector('.tgme_channel_info_description, [class*="channel-description"]')?.textContent?.trim()
        const avatarUrl = (document.querySelector('.tgme_page_photo_image img, [class*="channel-photo"] img') as HTMLImageElement)?.src

        const subscribersEl = document.querySelector('.tgme_channel_info_counter, [class*="subscribers"]')
        const subscribersText = subscribersEl?.textContent?.trim() || '0'
        let subscribers = 0
        if (subscribersText.includes('K') || subscribersText.includes('К')) {
          subscribers = parseFloat(subscribersText) * 1000
        } else if (subscribersText.includes('M') || subscribersText.includes('М')) {
          subscribers = parseFloat(subscribersText) * 1000000
        } else {
          subscribers = parseInt(subscribersText.replace(/\D/g, '')) || 0
        }

        return { displayName, bio, avatarUrl, subscribers: Math.round(subscribers) }
      })

      return {
        platform: 'telegram',
        username: channelUsername,
        displayName: profileData.displayName || channelUsername,
        bio: profileData.bio,
        followers: profileData.subscribers,
        profileUrl: `https://t.me/${channelUsername}`,
        avatarUrl: profileData.avatarUrl,
        parsedAt: new Date(),
      }
    } catch (err) {
      console.error(`Ошибка профиля Telegram @${channelUsername}:`, err)
      return null
    } finally {
      await this.close()
    }
  }

  // Парсинг нескольких каналов
  async scrapeMultipleChannels(channels: string[]): Promise<ParseResult> {
    const startTime = Date.now()
    const allPosts: ParsedPost[] = []
    const errors: string[] = []

    for (const channel of channels) {
      const result = await this.scrapeChannel(channel)
      allPosts.push(...result.posts)
      errors.push(...result.errors)
      await this.delay(2000) // Задержка между каналами
    }

    // Сортируем по просмотрам
    allPosts.sort((a, b) => (b.views || 0) - (a.views || 0))

    return {
      success: allPosts.length > 0,
      platform: 'telegram',
      profiles: [],
      posts: allPosts.slice(0, this.config.maxPosts),
      errors,
      stats: {
        profilesFound: 0,
        postsFound: allPosts.length,
        duration: Date.now() - startTime,
      },
    }
  }
}
