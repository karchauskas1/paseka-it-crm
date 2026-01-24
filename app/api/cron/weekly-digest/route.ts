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
  if (TELEGRAM_USERNAMES[userName]) {
    return TELEGRAM_USERNAMES[userName]
  }
  for (const [name, username] of Object.entries(TELEGRAM_USERNAMES)) {
    if (userName.toLowerCase().includes(name.toLowerCase())) {
      return username
    }
  }
  return userName
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

const priorityEmoji: Record<string, string> = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  URGENT: '🔴',
}

const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

export async function GET(req: NextRequest) {
  try {
    // Проверка секрета для cron jobs
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
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
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const results = []

    for (const workspace of workspaces) {
      // Получаем все задачи на неделю
      const tasks = await db.task.findMany({
        where: {
          workspaceId: workspace.id,
          dueDate: {
            gte: today,
            lt: weekEnd,
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
          { dueDate: 'asc' },
          { priority: 'desc' },
        ],
      })

      // Получаем события на неделю
      const events = await db.event.findMany({
        where: {
          workspaceId: workspace.id,
          startDate: {
            gte: today,
            lt: weekEnd,
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

      // Получаем касания с follow-up на неделю
      const touches = await db.touch.findMany({
        where: {
          workspaceId: workspace.id,
          followUpAt: {
            gte: today,
            lt: weekEnd,
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
        continue
      }

      // Группируем по дням
      const tasksByDay: Record<string, typeof tasks> = {}
      const eventsByDay: Record<string, typeof events> = {}
      const touchesByDay: Record<string, typeof touches> = {}

      for (const task of tasks) {
        if (!task.dueDate) continue
        const dayKey = task.dueDate.toISOString().split('T')[0]
        if (!tasksByDay[dayKey]) tasksByDay[dayKey] = []
        tasksByDay[dayKey].push(task)
      }

      for (const event of events) {
        const dayKey = event.startDate.toISOString().split('T')[0]
        if (!eventsByDay[dayKey]) eventsByDay[dayKey] = []
        eventsByDay[dayKey].push(event)
      }

      for (const touch of touches) {
        if (!touch.followUpAt) continue
        const dayKey = touch.followUpAt.toISOString().split('T')[0]
        if (!touchesByDay[dayKey]) touchesByDay[dayKey] = []
        touchesByDay[dayKey].push(touch)
      }

      // Получаем все уникальные дни
      const allDays = new Set([
        ...Object.keys(tasksByDay),
        ...Object.keys(eventsByDay),
        ...Object.keys(touchesByDay),
      ])
      const sortedDays = Array.from(allDays).sort()

      // Формируем сообщение
      const startStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      const endDate = new Date(weekEnd)
      endDate.setDate(endDate.getDate() - 1)
      const endStr = endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

      let message = `📊 *План на неделю*\n`
      message += `${escapeMarkdown(startStr)} \\- ${escapeMarkdown(endStr)}\n\n`

      // Сначала общая сводка по людям
      const tasksByUser: Record<string, number> = {}
      const touchesByUser: Record<string, number> = {}

      for (const task of tasks) {
        const userName = task.assignee?.name || 'Не назначено'
        tasksByUser[userName] = (tasksByUser[userName] || 0) + 1
      }

      for (const touch of touches) {
        const userName = touch.assignee?.name || 'Не назначено'
        touchesByUser[userName] = (touchesByUser[userName] || 0) + 1
      }

      message += `📈 *Сводка:*\n`
      message += `• Задач: ${tasks.length}\n`
      message += `• Событий: ${events.length}\n`
      message += `• Касаний: ${touches.length}\n\n`

      // Нагрузка по людям
      const allUsers = new Set([...Object.keys(tasksByUser), ...Object.keys(touchesByUser)])
      if (allUsers.size > 0) {
        message += `👥 *Нагрузка:*\n`
        for (const userName of allUsers) {
          const tgUsername = getTelegramUsername(userName)
          const userTasks = tasksByUser[userName] || 0
          const userTouches = touchesByUser[userName] || 0
          message += `${tgUsername}: ${userTasks} задач, ${userTouches} касаний\n`
        }
        message += `\n`
      }

      // По дням
      message += `📅 *По дням:*\n\n`

      for (const dayKey of sortedDays) {
        const date = new Date(dayKey)
        const dayName = dayNames[date.getDay()]
        const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

        const dayTasks = tasksByDay[dayKey] || []
        const dayEvents = eventsByDay[dayKey] || []
        const dayTouches = touchesByDay[dayKey] || []

        message += `*${escapeMarkdown(dayName)}, ${escapeMarkdown(dateStr)}*\n`

        // Задачи дня
        for (const task of dayTasks) {
          const priority = priorityEmoji[task.priority] || '⚪'
          const tgUsername = task.assignee ? getTelegramUsername(task.assignee.name) : 'не назначено'
          message += `  ${priority} ${escapeMarkdown(task.title)} \\(${tgUsername}\\)\n`
        }

        // События дня
        for (const event of dayEvents) {
          const time = event.allDay
            ? '🕐'
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
          message += `  ${emoji} ${escapeMarkdown(time.toString())} ${escapeMarkdown(event.title)}\n`
        }

        // Касания дня
        for (const touch of dayTouches) {
          const tgUsername = touch.assignee ? getTelegramUsername(touch.assignee.name) : 'не назначено'
          message += `  🤝 ${escapeMarkdown(touch.contactName)} \\(${tgUsername}\\)\n`
        }

        message += `\n`
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
        console.error('Telegram API error:', error, 'Message length:', message.length)
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
      message: 'Weekly digest sent',
      results,
      dateRange: {
        start: today.toISOString(),
        end: weekEnd.toISOString(),
      },
    })
  } catch (error) {
    console.error('Weekly digest error:', error)
    return NextResponse.json({ error: 'Failed to send weekly digest' }, { status: 500 })
  }
}
