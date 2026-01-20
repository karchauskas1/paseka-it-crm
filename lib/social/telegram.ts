/**
 * Telegram Integration via Bot API
 *
 * Преимущества:
 * - Огромная российская аудитория
 * - Бизнес-каналы и чаты
 * - Real-time доступ через Bot API
 *
 * Требования:
 * - Telegram bot token (создать через @BotFather)
 * - Бот должен быть добавлен в целевые каналы
 */

import TelegramBot from 'node-telegram-bot-api'

export interface TelegramPost {
  id: string
  author: string
  title: string
  content: string
  url: string
  score: number // views
  comments: number
  createdAt: Date
  channelUsername?: string
}

/**
 * Поиск сообщений в публичном Telegram канале
 *
 * Note: Для работы требуется либо:
 * 1. Бот добавлен в канал (для приватных каналов)
 * 2. Web scraping публичных каналов через t.me/s/
 *
 * @param channelUsername - username канала (без @)
 * @param keyword - ключевое слово для поиска
 * @param limit - максимальное количество сообщений
 * @returns массив постов
 */
export async function searchTelegramChannel(
  channelUsername: string,
  keyword: string,
  limit: number = 50
): Promise<TelegramPost[]> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not found in environment variables')
    }

    // Для публичных каналов используем web scraping подход
    // т.к. Bot API требует чтобы бот был участником канала
    return await scrapePublicChannel(channelUsername, keyword, limit)
  } catch (error: any) {
    console.error('Telegram search error:', error)
    throw new Error(`Failed to search Telegram: ${error.message}`)
  }
}

/**
 * Web scraping публичных каналов через t.me/s/
 * Не требует добавления бота в канал
 */
async function scrapePublicChannel(
  channelUsername: string,
  keyword: string,
  limit: number = 50
): Promise<TelegramPost[]> {
  try {
    // t.me/s/ предоставляет веб-версию публичных каналов
    const url = `https://t.me/s/${channelUsername}`

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch channel: ${response.status}`)
    }

    const html = await response.text()

    // Парсинг HTML для извлечения постов
    // Note: Это упрощенная версия, можно улучшить с помощью cheerio или jsdom
    const posts = parseChannelHTML(html, channelUsername, keyword)

    return posts.slice(0, limit)
  } catch (error: any) {
    console.error('Channel scraping error:', error)
    return []
  }
}

/**
 * Простой парсинг HTML канала
 * TODO: Улучшить с помощью cheerio для более надежного парсинга
 */
function parseChannelHTML(
  html: string,
  channelUsername: string,
  keyword: string
): TelegramPost[] {
  const posts: TelegramPost[] = []
  const keywordLower = keyword.toLowerCase()

  // Упрощенный regex для поиска постов
  // В реальности лучше использовать cheerio/jsdom
  const messagePattern =
    /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  const datePattern = /<time[^>]*datetime="([^"]*)"[^>]*>/g
  const viewsPattern = /<span class="tgme_widget_message_views">([^<]*)<\/span>/g

  let messageMatch
  const messages = []
  const dates = []
  const views = []

  while ((messageMatch = messagePattern.exec(html)) !== null) {
    messages.push(messageMatch[1])
  }

  let dateMatch
  while ((dateMatch = datePattern.exec(html)) !== null) {
    dates.push(dateMatch[1])
  }

  let viewMatch
  while ((viewMatch = viewsPattern.exec(html)) !== null) {
    views.push(viewMatch[1])
  }

  // Объединить данные
  for (let i = 0; i < messages.length; i++) {
    const text = messages[i]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()

    // Фильтрация по ключевому слову
    if (text.toLowerCase().includes(keywordLower)) {
      posts.push({
        id: `${channelUsername}_${i}`,
        author: channelUsername,
        title: text.substring(0, 100),
        content: text,
        url: `https://t.me/${channelUsername}/${i + 1}`,
        score: parseInt(views[i]?.replace(/[^0-9]/g, '') || '0', 10),
        comments: 0,
        createdAt: new Date(dates[i] || Date.now()),
        channelUsername,
      })
    }
  }

  return posts
}

/**
 * Поиск по нескольким каналам одновременно
 */
export async function searchMultipleChannels(
  channels: string[],
  keyword: string,
  limit: number = 50
): Promise<TelegramPost[]> {
  try {
    const searches = channels.map((channel) =>
      searchTelegramChannel(channel, keyword, Math.ceil(limit / channels.length))
    )

    const results = await Promise.allSettled(searches)

    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r: any) => r.value)
      .slice(0, limit)
  } catch (error: any) {
    console.error('Multiple channels search error:', error)
    throw new Error(`Failed to search multiple channels: ${error.message}`)
  }
}

/**
 * Рекомендуемые каналы для мониторинга болей бизнеса
 */
export const TARGET_CHANNELS = [
  'vcnews', // VC.ru новости
  'rusbase', // Rusbase
  'startupof', // Стартапы
  'sozdaembizneschat', // Создаем бизнес
  'biznes_molodost', // Бизнес молодость
  'itmozg', // IT Мозг
  'protraffic', // Про трафик
] as const

/**
 * Note: Альтернативный подход - использовать Bot API
 * Требует добавления бота в каналы как админа
 */
export async function searchWithBotAPI(
  channelId: string,
  keyword: string
): Promise<TelegramPost[]> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured')
  }

  const bot = new TelegramBot(botToken, { polling: false })

  try {
    // Для работы с историей сообщений бот должен быть админом канала
    // Это ограничение Telegram Bot API

    // TODO: Реализовать через MTProto API для полного доступа
    // Пока используем web scraping для публичных каналов

    return []
  } catch (error: any) {
    console.error('Bot API error:', error)
    throw new Error(`Bot API failed: ${error.message}`)
  }
}
