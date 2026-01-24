import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Маппинг имён пользователей на Telegram usernames
// Поддерживает частичное совпадение (имя или часть имени)
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
    .replace(/-/g, '\\-')
}

const CRM_URL = 'https://www.pasekait-crm.ru'

const priorityEmoji: Record<string, string> = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  URGENT: '🔴',
}

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
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const results = []

    for (const workspace of workspaces) {
      // Получаем задачи на сегодня
      const todayTasks = await db.task.findMany({
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

      // Получаем ПРОСРОЧЕННЫЕ задачи (dueDate < today)
      const overdueTasks = await db.task.findMany({
        where: {
          workspaceId: workspace.id,
          dueDate: {
            lt: today,
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
      const todayTouches = await db.touch.findMany({
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

      // Получаем ПРОСРОЧЕННЫЕ касания
      const overdueTouches = await db.touch.findMany({
        where: {
          workspaceId: workspace.id,
          followUpAt: {
            lt: today,
          },
          status: {
            notIn: ['CONVERTED', 'RESPONDED', 'NO_RESPONSE'],
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

      if (todayTasks.length === 0 && overdueTasks.length === 0 && events.length === 0 && todayTouches.length === 0 && overdueTouches.length === 0) {
        continue
      }

      // Группируем ВСЁ по пользователям
      interface UserData {
        tasks: typeof todayTasks
        overdueTasks: typeof overdueTasks
        touches: typeof todayTouches
        overdueTouches: typeof overdueTouches
      }
      const dataByUser: Record<string, UserData> = {}

      // Собираем всех уникальных пользователей
      const allUsers = new Set<string>()

      for (const task of todayTasks) {
        const userName = task.assignee?.name || 'Не назначено'
        allUsers.add(userName)
        if (!dataByUser[userName]) dataByUser[userName] = { tasks: [], overdueTasks: [], touches: [], overdueTouches: [] }
        dataByUser[userName].tasks.push(task)
      }

      for (const task of overdueTasks) {
        const userName = task.assignee?.name || 'Не назначено'
        allUsers.add(userName)
        if (!dataByUser[userName]) dataByUser[userName] = { tasks: [], overdueTasks: [], touches: [], overdueTouches: [] }
        dataByUser[userName].overdueTasks.push(task)
      }

      for (const touch of todayTouches) {
        const userName = touch.assignee?.name || 'Не назначено'
        allUsers.add(userName)
        if (!dataByUser[userName]) dataByUser[userName] = { tasks: [], overdueTasks: [], touches: [], overdueTouches: [] }
        dataByUser[userName].touches.push(touch)
      }

      for (const touch of overdueTouches) {
        const userName = touch.assignee?.name || 'Не назначено'
        allUsers.add(userName)
        if (!dataByUser[userName]) dataByUser[userName] = { tasks: [], overdueTasks: [], touches: [], overdueTouches: [] }
        dataByUser[userName].overdueTouches.push(touch)
      }

      // Формируем сообщение
      const dateStr = today.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      let message = `📅 *${escapeMarkdown(dateStr)}*\n\n`

      // Сначала общие события (не привязаны к пользователям)
      if (events.length > 0) {
        message += `📆 *СОБЫТИЯ НА СЕГОДНЯ:*\n`
        for (const event of events) {
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
          message += `${emoji} ${escapeMarkdown(time.toString())} ${escapeMarkdown(event.title)}\n`
        }
        message += `\n`
      }

      // По каждому пользователю
      for (const userName of Array.from(allUsers).sort()) {
        const userData = dataByUser[userName]
        const tgUsername = getTelegramUsername(userName)

        const hasAnything = userData.tasks.length > 0 || userData.overdueTasks.length > 0 ||
                           userData.touches.length > 0 || userData.overdueTouches.length > 0

        if (!hasAnything) continue

        message += `━━━━━━━━━━━━━━━\n`
        message += `👤 *${tgUsername}*\n\n`

        // Просроченные задачи (красным)
        if (userData.overdueTasks.length > 0) {
          message += `🚨 *Просроченные задачи:*\n`
          for (const task of userData.overdueTasks) {
            const priority = priorityEmoji[task.priority] || '⚪'
            const dueStr = task.dueDate ? task.dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
            message += `  ${priority} ${escapeMarkdown(task.title)} \\(${escapeMarkdown(dueStr)}\\)\n`
          }
          message += `\n`
        }

        // Просроченные касания
        if (userData.overdueTouches.length > 0) {
          message += `🚨 *Просроченные касания:*\n`
          for (const touch of userData.overdueTouches) {
            const dueStr = touch.followUpAt ? touch.followUpAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
            message += `  📱 ${escapeMarkdown(touch.contactName)}`
            if (touch.contactCompany) {
              message += ` \\(${escapeMarkdown(touch.contactCompany)}\\)`
            }
            message += ` — ${escapeMarkdown(dueStr)}\n`
          }
          message += `\n`
        }

        // Задачи на сегодня
        if (userData.tasks.length > 0) {
          message += `📋 *Задачи на сегодня:*\n`
          for (const task of userData.tasks) {
            const priority = priorityEmoji[task.priority] || '⚪'
            const projectName = task.project ? ` \\[${escapeMarkdown(task.project.name)}\\]` : ''
            message += `  ${priority} ${escapeMarkdown(task.title)}${projectName}\n`
          }
          message += `\n`
        }

        // Касания на сегодня
        if (userData.touches.length > 0) {
          message += `🤝 *Касания \\(follow\\-up\\):*\n`
          for (const touch of userData.touches) {
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
          todayTasks: todayTasks.length,
          overdueTasks: overdueTasks.length,
          events: events.length,
          todayTouches: todayTouches.length,
          overdueTouches: overdueTouches.length,
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
