import { db } from '@/lib/db'

const CRM_URL = 'https://www.pasekait-crm.ru'

// Типы событий для уведомлений в группу
export type TelegramGroupEventType =
  | 'taskCreated'
  | 'taskStatusChanged'
  | 'taskAssigned'
  | 'taskDeleted'
  | 'projectCreated'
  | 'projectStatusChanged'
  | 'projectDeleted'
  | 'clientCreated'
  | 'clientUpdated'
  | 'clientDeleted'
  | 'commentAdded'
  | 'feedbackSubmitted'
  | 'eventCreated'

// Интерфейс настроек уведомлений
export interface TelegramGroupNotificationsSettings {
  enabled: boolean
  events: {
    taskCreated: boolean
    taskStatusChanged: boolean
    taskAssigned: boolean
    taskDeleted: boolean
    projectCreated: boolean
    projectStatusChanged: boolean
    projectDeleted: boolean
    clientCreated: boolean
    clientUpdated: boolean
    clientDeleted: boolean
    commentAdded: boolean
    feedbackSubmitted: boolean
    eventCreated: boolean
  }
}

// Настройки по умолчанию (все включено)
export const defaultNotificationSettings: TelegramGroupNotificationsSettings = {
  enabled: true,
  events: {
    taskCreated: true,
    taskStatusChanged: true,
    taskAssigned: true,
    taskDeleted: true,
    projectCreated: true,
    projectStatusChanged: true,
    projectDeleted: true,
    clientCreated: true,
    clientUpdated: true,
    clientDeleted: true,
    commentAdded: true,
    feedbackSubmitted: true,
    eventCreated: true,
  },
}

// Лейблы статусов задач
const taskStatusLabels: Record<string, string> = {
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  IN_REVIEW: 'На проверке',
  COMPLETED: 'Завершена',
  BLOCKED: 'Заблокирована',
  CANCELLED: 'Отменена',
}

// Лейблы статусов проектов
const projectStatusLabels: Record<string, string> = {
  LEAD: 'Лид',
  QUALIFICATION: 'Квалификация',
  BRIEFING: 'Брифинг',
  IN_PROGRESS: 'В работе',
  ON_HOLD: 'На паузе',
  COMPLETED: 'Завершён',
  REJECTED: 'Отклонён',
  ARCHIVED: 'Архив',
}

// Данные для разных типов событий
interface TaskEventData {
  taskId: string
  taskTitle: string
  projectName?: string
  userName: string
  assigneeName?: string
  oldStatus?: string
  newStatus?: string
}

interface ProjectEventData {
  projectId: string
  projectName: string
  clientName?: string
  userName: string
  oldStatus?: string
  newStatus?: string
}

interface ClientEventData {
  clientId: string
  clientName: string
  company?: string
  userName: string
  changes?: string
}

interface CommentEventData {
  entityType: 'project' | 'task'
  entityId: string
  entityName: string
  userName: string
  commentPreview: string
}

interface FeedbackEventData {
  feedbackId: string
  type: string
  title: string
  userName: string
}

interface CalendarEventData {
  eventId: string
  eventTitle: string
  eventType: string
  startDate: string
  userName: string
  projectName?: string
  clientName?: string
}

type EventData =
  | TaskEventData
  | ProjectEventData
  | ClientEventData
  | CommentEventData
  | FeedbackEventData
  | CalendarEventData

/**
 * Форматирование сообщения для Telegram
 */
function formatMessage(eventType: TelegramGroupEventType, data: EventData): string {
  switch (eventType) {
    case 'taskCreated': {
      const d = data as TaskEventData
      let msg = `📋 *Новая задача*\n\n`
      msg += `*${escapeMarkdown(d.taskTitle)}*\n`
      if (d.projectName) msg += `Проект: ${escapeMarkdown(d.projectName)}\n`
      msg += `Создал: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/tasks/${d.taskId})`
      return msg
    }

    case 'taskStatusChanged': {
      const d = data as TaskEventData
      const oldLabel = taskStatusLabels[d.oldStatus || ''] || d.oldStatus
      const newLabel = taskStatusLabels[d.newStatus || ''] || d.newStatus
      let msg = `🔄 *Статус задачи изменён*\n\n`
      msg += `*${escapeMarkdown(d.taskTitle)}*\n`
      msg += `${escapeMarkdown(oldLabel || '')} → *${escapeMarkdown(newLabel || '')}*\n`
      msg += `Изменил: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/tasks/${d.taskId})`
      return msg
    }

    case 'taskAssigned': {
      const d = data as TaskEventData
      let msg = `👤 *Задача назначена*\n\n`
      msg += `*${escapeMarkdown(d.taskTitle)}*\n`
      msg += `Исполнитель: ${escapeMarkdown(d.assigneeName || 'Не назначен')}\n`
      msg += `Назначил: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/tasks/${d.taskId})`
      return msg
    }

    case 'taskDeleted': {
      const d = data as TaskEventData
      let msg = `🗑 *Задача удалена*\n\n`
      msg += `*${escapeMarkdown(d.taskTitle)}*\n`
      msg += `Удалил: ${escapeMarkdown(d.userName)}`
      return msg
    }

    case 'projectCreated': {
      const d = data as ProjectEventData
      let msg = `📁 *Новый проект*\n\n`
      msg += `*${escapeMarkdown(d.projectName)}*\n`
      if (d.clientName) msg += `Клиент: ${escapeMarkdown(d.clientName)}\n`
      msg += `Создал: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/projects/${d.projectId})`
      return msg
    }

    case 'projectStatusChanged': {
      const d = data as ProjectEventData
      const oldLabel = projectStatusLabels[d.oldStatus || ''] || d.oldStatus
      const newLabel = projectStatusLabels[d.newStatus || ''] || d.newStatus
      let msg = `🔄 *Статус проекта изменён*\n\n`
      msg += `*${escapeMarkdown(d.projectName)}*\n`
      msg += `${escapeMarkdown(oldLabel || '')} → *${escapeMarkdown(newLabel || '')}*\n`
      msg += `Изменил: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/projects/${d.projectId})`
      return msg
    }

    case 'projectDeleted': {
      const d = data as ProjectEventData
      let msg = `🗑 *Проект удалён*\n\n`
      msg += `*${escapeMarkdown(d.projectName)}*\n`
      msg += `Удалил: ${escapeMarkdown(d.userName)}`
      return msg
    }

    case 'clientCreated': {
      const d = data as ClientEventData
      let msg = `🏢 *Новый клиент*\n\n`
      msg += `*${escapeMarkdown(d.clientName)}*\n`
      if (d.company) msg += `Компания: ${escapeMarkdown(d.company)}\n`
      msg += `Создал: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/clients/${d.clientId})`
      return msg
    }

    case 'clientUpdated': {
      const d = data as ClientEventData
      let msg = `✏️ *Клиент обновлён*\n\n`
      msg += `*${escapeMarkdown(d.clientName)}*\n`
      if (d.changes) msg += `Изменения: ${escapeMarkdown(d.changes)}\n`
      msg += `Изменил: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/clients/${d.clientId})`
      return msg
    }

    case 'clientDeleted': {
      const d = data as ClientEventData
      let msg = `🗑 *Клиент удалён*\n\n`
      msg += `*${escapeMarkdown(d.clientName)}*\n`
      msg += `Удалил: ${escapeMarkdown(d.userName)}`
      return msg
    }

    case 'commentAdded': {
      const d = data as CommentEventData
      const entityLabel = d.entityType === 'project' ? 'проекту' : 'задаче'
      let msg = `💬 *Новый комментарий*\n\n`
      msg += `К ${entityLabel}: *${escapeMarkdown(d.entityName)}*\n`
      msg += `Автор: ${escapeMarkdown(d.userName)}\n\n`
      msg += `"${escapeMarkdown(d.commentPreview.slice(0, 200))}${d.commentPreview.length > 200 ? '...' : ''}"`
      const link = d.entityType === 'project' ? `/projects/${d.entityId}` : `/tasks/${d.entityId}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}${link})`
      return msg
    }

    case 'feedbackSubmitted': {
      const d = data as FeedbackEventData
      const typeLabels: Record<string, string> = {
        BUG: '🐛 Баг',
        FEATURE: '💡 Предложение',
        IMPROVEMENT: '✨ Улучшение',
      }
      let msg = `📝 *Новая обратная связь*\n\n`
      msg += `Тип: ${typeLabels[d.type] || d.type}\n`
      msg += `*${escapeMarkdown(d.title)}*\n`
      msg += `От: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/feedback)`
      return msg
    }

    case 'eventCreated': {
      const d = data as CalendarEventData
      const eventTypeLabels: Record<string, string> = {
        MEETING: '👥 Встреча',
        CALL: '📞 Созвон',
        REMINDER: '🔔 Напоминание',
        DEADLINE: '⏰ Дедлайн',
        TASK_DUE: '📋 Срок задачи',
        MILESTONE: '🎯 Веха',
      }
      const typeIcon = eventTypeLabels[d.eventType] || '📅 Событие'
      let msg = `${typeIcon}\n\n`
      msg += `*${escapeMarkdown(d.eventTitle)}*\n`
      msg += `📅 ${escapeMarkdown(d.startDate)}\n`
      if (d.projectName) msg += `Проект: ${escapeMarkdown(d.projectName)}\n`
      if (d.clientName) msg += `Клиент: ${escapeMarkdown(d.clientName)}\n`
      msg += `Создал: ${escapeMarkdown(d.userName)}`
      msg += `\n\n[Открыть в CRM](${CRM_URL}/calendar)`
      return msg
    }

    default:
      return `🔔 Новое событие в CRM`
  }
}

/**
 * Экранирование специальных символов для Telegram MarkdownV2
 * Символы: _ * [ ] ( ) ~ ` > # + - = | { } . !
 * Минус экранируем только если он в начале строки (список)
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
    .replace(/^-/gm, '\\-') // Экранируем минус только в начале строки
}

/**
 * Главная функция отправки уведомления в группу
 */
export async function notifyTelegramGroup(
  workspaceId: string,
  eventType: TelegramGroupEventType,
  data: EventData
): Promise<boolean> {
  try {
    // Получаем настройки workspace
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        telegramBotToken: true,
        telegramChatId: true,
        telegramGroupNotifications: true,
      },
    })

    if (!workspace) {
      console.log('Workspace not found for telegram notification')
      return false
    }

    // Проверяем наличие токена и chatId
    if (!workspace.telegramBotToken || !workspace.telegramChatId) {
      console.log('Telegram not configured for workspace')
      return false
    }

    // Парсим настройки уведомлений
    const settings = (workspace.telegramGroupNotifications as unknown as TelegramGroupNotificationsSettings) || defaultNotificationSettings

    // Проверяем включены ли уведомления
    if (!settings.enabled) {
      console.log('Telegram group notifications disabled')
      return false
    }

    // Проверяем включен ли этот тип события
    if (settings.events && !settings.events[eventType]) {
      console.log(`Event type ${eventType} disabled`)
      return false
    }

    // Форматируем сообщение
    const message = formatMessage(eventType, data)

    // Отправляем в Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${workspace.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: workspace.telegramChatId,
          text: message,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Telegram API error:', error)
      return false
    }

    console.log(`Telegram notification sent: ${eventType}`)
    return true
  } catch (error) {
    console.error('Error sending telegram group notification:', error)
    return false
  }
}

// Хелперы для удобного вызова

export async function notifyTaskCreated(
  workspaceId: string,
  taskId: string,
  taskTitle: string,
  userName: string,
  projectName?: string
) {
  return notifyTelegramGroup(workspaceId, 'taskCreated', {
    taskId,
    taskTitle,
    userName,
    projectName,
  })
}

export async function notifyTaskStatusChanged(
  workspaceId: string,
  taskId: string,
  taskTitle: string,
  userName: string,
  oldStatus: string,
  newStatus: string
) {
  return notifyTelegramGroup(workspaceId, 'taskStatusChanged', {
    taskId,
    taskTitle,
    userName,
    oldStatus,
    newStatus,
  })
}

export async function notifyTaskAssigned(
  workspaceId: string,
  taskId: string,
  taskTitle: string,
  userName: string,
  assigneeName: string
) {
  return notifyTelegramGroup(workspaceId, 'taskAssigned', {
    taskId,
    taskTitle,
    userName,
    assigneeName,
  })
}

export async function notifyTaskDeleted(
  workspaceId: string,
  taskTitle: string,
  userName: string
) {
  return notifyTelegramGroup(workspaceId, 'taskDeleted', {
    taskId: '',
    taskTitle,
    userName,
  })
}

export async function notifyProjectCreated(
  workspaceId: string,
  projectId: string,
  projectName: string,
  userName: string,
  clientName?: string
) {
  return notifyTelegramGroup(workspaceId, 'projectCreated', {
    projectId,
    projectName,
    userName,
    clientName,
  })
}

export async function notifyProjectStatusChanged(
  workspaceId: string,
  projectId: string,
  projectName: string,
  userName: string,
  oldStatus: string,
  newStatus: string
) {
  return notifyTelegramGroup(workspaceId, 'projectStatusChanged', {
    projectId,
    projectName,
    userName,
    oldStatus,
    newStatus,
  })
}

export async function notifyProjectDeleted(
  workspaceId: string,
  projectName: string,
  userName: string
) {
  return notifyTelegramGroup(workspaceId, 'projectDeleted', {
    projectId: '',
    projectName,
    userName,
  })
}

export async function notifyClientCreated(
  workspaceId: string,
  clientId: string,
  clientName: string,
  userName: string,
  company?: string
) {
  return notifyTelegramGroup(workspaceId, 'clientCreated', {
    clientId,
    clientName,
    userName,
    company,
  })
}

export async function notifyClientUpdated(
  workspaceId: string,
  clientId: string,
  clientName: string,
  userName: string,
  changes?: string
) {
  return notifyTelegramGroup(workspaceId, 'clientUpdated', {
    clientId,
    clientName,
    userName,
    changes,
  })
}

export async function notifyClientDeleted(
  workspaceId: string,
  clientName: string,
  userName: string
) {
  return notifyTelegramGroup(workspaceId, 'clientDeleted', {
    clientId: '',
    clientName,
    userName,
  })
}

export async function notifyCommentAdded(
  workspaceId: string,
  entityType: 'project' | 'task',
  entityId: string,
  entityName: string,
  userName: string,
  commentPreview: string
) {
  return notifyTelegramGroup(workspaceId, 'commentAdded', {
    entityType,
    entityId,
    entityName,
    userName,
    commentPreview,
  })
}

export async function notifyFeedbackSubmitted(
  workspaceId: string,
  feedbackId: string,
  type: string,
  title: string,
  userName: string
) {
  return notifyTelegramGroup(workspaceId, 'feedbackSubmitted', {
    feedbackId,
    type,
    title,
    userName,
  })
}

export async function notifyEventCreated(
  workspaceId: string,
  eventId: string,
  eventTitle: string,
  eventType: string,
  startDate: string,
  userName: string,
  projectName?: string,
  clientName?: string
) {
  return notifyTelegramGroup(workspaceId, 'eventCreated', {
    eventId,
    eventTitle,
    eventType,
    startDate,
    userName,
    projectName,
    clientName,
  })
}
