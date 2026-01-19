import TelegramBot from 'node-telegram-bot-api'

let bot: TelegramBot | null = null

export function getTelegramBot(): TelegramBot | null {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not configured')
    return null
  }

  if (!bot) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
  }

  return bot
}

export async function sendTelegramNotification(
  telegramId: string,
  message: string
): Promise<boolean> {
  const bot = getTelegramBot()
  if (!bot) return false

  try {
    await bot.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
    })
    return true
  } catch (error) {
    console.error('Telegram notification error:', error)
    return false
  }
}

export async function notifyProjectStatusChange(
  telegramId: string,
  projectName: string,
  oldStatus: string,
  newStatus: string
) {
  const message = `
🔔 *Изменение статуса проекта*

Проект: *${projectName}*
${oldStatus} → *${newStatus}*
  `.trim()

  return sendTelegramNotification(telegramId, message)
}

export async function notifyTaskAssigned(
  telegramId: string,
  taskTitle: string,
  projectName: string,
  dueDate?: Date
) {
  let message = `
📋 *Новая задача назначена*

Задача: *${taskTitle}*
Проект: ${projectName}
  `.trim()

  if (dueDate) {
    message += `\nСрок: ${dueDate.toLocaleDateString('ru-RU')}`
  }

  return sendTelegramNotification(telegramId, message)
}

export async function notifyTaskDueSoon(
  telegramId: string,
  taskTitle: string,
  dueDate: Date
) {
  const message = `
⏰ *Напоминание о задаче*

Задача: *${taskTitle}*
Срок: ${dueDate.toLocaleDateString('ru-RU')}

Задача должна быть выполнена скоро!
  `.trim()

  return sendTelegramNotification(telegramId, message)
}

export async function notifyNewComment(
  telegramId: string,
  authorName: string,
  entityType: string,
  entityName: string,
  commentPreview: string
) {
  const message = `
💬 *Новый комментарий*

*${authorName}* оставил комментарий к ${entityType === 'project' ? 'проекту' : 'задаче'}:
*${entityName}*

${commentPreview.slice(0, 100)}${commentPreview.length > 100 ? '...' : ''}
  `.trim()

  return sendTelegramNotification(telegramId, message)
}

export async function notifyProjectDeadline(
  telegramId: string,
  projectName: string,
  endDate: Date,
  daysLeft: number
) {
  const emoji = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '📅'

  const message = `
${emoji} *Приближается дедлайн проекта*

Проект: *${projectName}*
Срок: ${endDate.toLocaleDateString('ru-RU')}
Осталось дней: ${daysLeft}
  `.trim()

  return sendTelegramNotification(telegramId, message)
}
