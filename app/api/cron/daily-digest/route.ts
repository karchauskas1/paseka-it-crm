import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Маппинг имён пользователей на Telegram usernames
const TELEGRAM_USERNAMES: Record<string, string> = {
  'Алексей': '@alexkotikov',
  'Анатолий': '@speromine1',
  'Данила': '@karchauskas',
}

// Получить Telegram username по имени пользователя
function getTelegramUsername(userName: string): string {
  // Проверяем точное совпадение
  if (TELEGRAM_USERNAMES[userName]) {
    return TELEGRAM_USERNAMES[userName]
  }
  // Проверяем частичное совпадение (имя может быть "Данила Карчаускас")
  for (const [name, username] of Object.entries(TELEGRAM_USERNAMES)) {
    if (userName.toLowerCase().includes(name.toLowerCase())) {
      return username
    }
  }
  return userName // Если не нашли, возвращаем просто имя
}

// Экранирование для MarkdownV2
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
    .replace(/^-/gm, '\\-')
}

const CRM_URL = 'https://www.pasekait-crm.ru'

const taskStatusLabels: Record<string, string> = {
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  IN_REVIEW: 'На проверке',
  COMPLETED: 'Завершена',
  BLOCKED: 'Заблокирована',
  CANCELLED: 'Отменена',
}

const priorityEmoji: Record<string, string> = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  URGENT: '🔴',
}

export async function GET(req: NextRequest) {
  try {
    // Проверка секрета для cron jobs (Vercel добавляет этот заголовок)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      // В production требуем секрет, в dev можно без него
      if (!req.nextUrl.searchParams.get('test')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Получаем все workspace с настроенным Telegram
    const workspaces = await db.workspace.findMany({
      where: {
        telegramBotToken: { not: null },
        telegramChatId: { not: null },
      },
      select: {
        id: true,
        name: true,
        telegramBotToken: true,
        telegramChatId: true,
      },
    })

    if (workspaces.length === 0) {
      return NextResponse.json({ message: 'No workspaces with Telegram configured' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const results = []

    for (const workspace of workspaces) {
      // Получаем задачи на сегодня
      const tasks = await db.task.findMany({
        where: {
          workspaceId: workspace.id,
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            notIn: ['COMPLETED', 'CANCELLED'],
          },
          isArchived: false,
        },
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
      })

      // Получаем события на сегодня
      const events = await db.event.findMany({
        where: {
          workspaceId: workspace.id,
          startDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          project: {
            select: { name: true },
          },
          client: {
            select: { name: true },
          },
        },
        orderBy: {
          startDate: 'asc',
        },
      })

      // Получаем касания с follow-up на сегодня
      const touches = await db.touch.findMany({
        where: {
          workspaceId: workspace.id,
          followUpAt: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            notIn: ['CONVERTED'],
          },
        },
        include: {
          assignee: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          followUpAt: 'asc',
        },
      })

      if (tasks.length === 0 && events.length === 0 && touches.length === 0) {
        continue // Пропускаем workspace без активности
      }

      // Группируем по исполнителям
      const tasksByUser: Record<string, typeof tasks> = {}
      const touchesByUser: Record<string, typeof touches> = {}

      for (const task of tasks) {
        const userId = task.assignee?.id || 'unassigned'
        const userName = task.assignee?.name || 'Не назначено'
        if (!tasksByUser[userName]) tasksByUser[userName] = []
        tasksByUser[userName].push(task)
      }

      for (const touch of touches) {
        const userName = touch.assignee?.name || 'Не назначено'
        if (!touchesByUser[userName]) touchesByUser[userName] = []
        touchesByUser[userName].push(touch)
      }

      // Формируем сообщение
      const dateStr = today.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      let message = `📅 *Задачи на ${escapeMarkdown(dateStr)}*\n\n`

      // Задачи по пользователям
      if (Object.keys(tasksByUser).length > 0) {
        message += `📋 *ЗАДАЧИ*\n\n`

        for (const [userName, userTasks] of Object.entries(tasksByUser)) {
          const tgUsername = getTelegramUsername(userName)
          message += `👤 ${tgUsername}\n`

          for (const task of userTasks) {
            const priority = priorityEmoji[task.priority] || '⚪'
            const projectName = task.project ? ` \\(${escapeMarkdown(task.project.name)}\\)` : ''
            message += `  ${priority} ${escapeMarkdown(task.title)}${projectName}\n`
          }
          message += `\n`
        }
      }

      // События
      if (events.length > 0) {
        message += `📆 *СОБЫТИЯ*\n\n`

        for (const event of events) {
          const time = event.allDay
            ? 'Весь день'
            : event.startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          const eventTypeEmoji: Record<string, string> = {
            MEETING: '👥',
            CALL: '📞',
            REMINDER: '🔔',
            DEADLINE: '⏰',
            TASK_DUE: '📋',
            MILESTONE: '🎯',
          }
          const emoji = eventTypeEmoji[event.type] || '📌'
          message += `  ${emoji} ${escapeMarkdown(time)} \\- ${escapeMarkdown(event.title)}\n`
        }
        message += `\n`
      }

      // Касания (follow-up)
      if (Object.keys(touchesByUser).length > 0) {
        message += `🤝 *КАСАНИЯ \\(follow\\-up\\)*\n\n`

        for (const [userName, userTouches] of Object.entries(touchesByUser)) {
          const tgUsername = getTelegramUsername(userName)
          message += `👤 ${tgUsername}\n`

          for (const touch of userTouches) {
            message += `  📱 ${escapeMarkdown(touch.contactName)}`
            if (touch.contactCompany) {
              message += ` \\(${escapeMarkdown(touch.contactCompany)}\\)`
            }
            message += `\n`
          }
          message += `\n`
        }
      }

      message += `[Открыть CRM](${CRM_URL})`

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
        console.error('Telegram API error:', error, 'Message:', message)
        results.push({ workspace: workspace.name, success: false, error })
      } else {
        results.push({
          workspace: workspace.name,
          success: true,
          tasksCount: tasks.length,
          eventsCount: events.length,
          touchesCount: touches.length,
        })
      }
    }

    return NextResponse.json({
      message: 'Daily digest sent',
      results,
      date: today.toISOString(),
    })
  } catch (error) {
    console.error('Daily digest error:', error)
    return NextResponse.json({ error: 'Failed to send daily digest' }, { status: 500 })
  }
}
