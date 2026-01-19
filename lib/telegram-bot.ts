import TelegramBot from 'node-telegram-bot-api'
import { db } from '@/lib/db'

let bot: TelegramBot | null = null

/**
 * Initialize Telegram bot with token
 */
export function initBot(token: string): TelegramBot {
  if (!bot || bot.token !== token) {
    bot = new TelegramBot(token, { polling: false })
  }
  return bot
}

/**
 * Get bot instance (returns null if not initialized)
 */
export function getBot(): TelegramBot | null {
  return bot
}

/**
 * Send notification to user via Telegram
 */
export async function sendTelegramNotification(
  telegramId: string,
  notification: {
    type: string
    title: string
    message?: string
    entityType?: string
    entityId?: string
  }
): Promise<boolean> {
  try {
    if (!bot) {
      console.error('Telegram bot not initialized')
      return false
    }

    const { type, title, message, entityType, entityId } = notification

    // Format notification based on type
    let text = ''
    let emoji = '🔔'

    switch (type) {
      case 'TASK_ASSIGNED':
        emoji = '📋'
        text = `${emoji} *Новая задача назначена*\n\n${title}`
        if (message) text += `\n\n${message}`
        break

      case 'TASK_DUE_SOON':
        emoji = '⏰'
        text = `${emoji} *Приближается дедлайн*\n\n${title}`
        if (message) text += `\n\n${message}`
        break

      case 'PROJECT_STATUS_CHANGED':
        emoji = '🔄'
        text = `${emoji} *Изменение статуса проекта*\n\n${title}`
        if (message) text += `\n\n${message}`
        break

      case 'COMMENT_ADDED':
        emoji = '💬'
        text = `${emoji} *Новый комментарий*\n\n${title}`
        if (message) text += `\n\n${message}`
        break

      case 'MENTION':
        emoji = '👤'
        text = `${emoji} *Вас упомянули*\n\n${title}`
        if (message) text += `\n\n${message}`
        break

      default:
        text = `${emoji} *${title}*`
        if (message) text += `\n\n${message}`
    }

    // Add link if entity info is provided
    if (entityType && entityId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      let link = ''

      switch (entityType) {
        case 'project':
          link = `${appUrl}/projects/${entityId}`
          break
        case 'task':
          link = `${appUrl}/tasks`
          break
        case 'client':
          link = `${appUrl}/clients`
          break
      }

      if (link) {
        text += `\n\n[Открыть в CRM](${link})`
      }
    }

    await bot.sendMessage(telegramId, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    })

    return true
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
    return false
  }
}

/**
 * Send message to Telegram chat
 */
export async function sendMessage(
  chatId: string | number,
  text: string,
  options?: TelegramBot.SendMessageOptions
): Promise<boolean> {
  try {
    if (!bot) {
      console.error('Telegram bot not initialized')
      return false
    }

    await bot.sendMessage(chatId, text, options)
    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

/**
 * Set webhook URL for bot
 */
export async function setWebhook(url: string): Promise<boolean> {
  try {
    if (!bot) {
      console.error('Telegram bot not initialized')
      return false
    }

    await bot.setWebHook(url)
    console.log('Telegram webhook set to:', url)
    return true
  } catch (error) {
    console.error('Error setting webhook:', error)
    return false
  }
}

/**
 * Delete webhook
 */
export async function deleteWebhook(): Promise<boolean> {
  try {
    if (!bot) {
      console.error('Telegram bot not initialized')
      return false
    }

    await bot.deleteWebHook()
    console.log('Telegram webhook deleted')
    return true
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return false
  }
}

/**
 * Get bot info
 */
export async function getBotInfo(): Promise<TelegramBot.User | null> {
  try {
    if (!bot) {
      console.error('Telegram bot not initialized')
      return null
    }

    return await bot.getMe()
  } catch (error) {
    console.error('Error getting bot info:', error)
    return null
  }
}

/**
 * Link user's Telegram ID
 */
export async function linkTelegramId(
  userId: string,
  telegramId: string,
  telegramName: string
): Promise<boolean> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        telegramId,
        telegramName,
      },
    })
    return true
  } catch (error) {
    console.error('Error linking Telegram ID:', error)
    return false
  }
}

/**
 * Unlink user's Telegram ID
 */
export async function unlinkTelegramId(userId: string): Promise<boolean> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        telegramId: null,
        telegramName: null,
      },
    })
    return true
  } catch (error) {
    console.error('Error unlinking Telegram ID:', error)
    return false
  }
}
