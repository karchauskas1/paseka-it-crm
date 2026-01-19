import { NextRequest, NextResponse } from 'next/server'
import { initBot } from '@/lib/telegram-bot'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Get bot token from workspace settings (assuming single workspace for now)
    // In a multi-workspace setup, you'd need to identify which workspace owns this bot
    const workspace = await db.workspace.findFirst({
      select: { telegramBotToken: true },
    })

    if (!workspace || !workspace.telegramBotToken) {
      return NextResponse.json({ error: 'Bot not configured' }, { status: 400 })
    }

    const bot = initBot(workspace.telegramBotToken)

    // Handle /start command
    if (body.message?.text?.startsWith('/start')) {
      const chatId = body.message.chat.id
      const username = body.message.from.username || body.message.from.first_name
      const telegramId = body.message.from.id.toString()

      const welcomeMessage = `Привет, ${username}! 👋\n\nЭто бот PASEKA IT CRM для уведомлений.\n\nВаш Telegram ID: \`${telegramId}\`\n\nСкопируйте этот ID и добавьте его в настройки профиля в CRM, чтобы начать получать уведомления.`

      await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' })

      return NextResponse.json({ ok: true })
    }

    // Handle /help command
    if (body.message?.text?.startsWith('/help')) {
      const chatId = body.message.chat.id

      const helpMessage = `*Доступные команды:*\n\n/start - Получить Telegram ID для привязки к аккаунту\n/help - Показать эту справку\n/status - Проверить статус подключения\n\nЧтобы начать получать уведомления, добавьте свой Telegram ID в настройки профиля в CRM.`

      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' })

      return NextResponse.json({ ok: true })
    }

    // Handle /status command
    if (body.message?.text?.startsWith('/status')) {
      const chatId = body.message.chat.id
      const telegramId = body.message.from.id.toString()

      // Check if user is linked
      const user = await db.user.findUnique({
        where: { telegramId },
        select: { name: true, email: true },
      })

      let statusMessage = ''
      if (user) {
        statusMessage = `✅ *Подключен к аккаунту*\n\nИмя: ${user.name}\nEmail: ${user.email}\n\nВы получаете уведомления о:\n• Новых задачах\n• Приближающихся дедлайнах\n• Изменениях статусов проектов\n• Новых комментариях`
      } else {
        statusMessage = `❌ *Не подключен*\n\nВаш Telegram ID: \`${telegramId}\`\n\nДобавьте этот ID в настройки профиля в CRM, чтобы начать получать уведомления.`
      }

      await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' })

      return NextResponse.json({ ok: true })
    }

    // For other messages, just acknowledge
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
