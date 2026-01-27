/**
 * Публичный API для финальной отправки брифа клиентом
 * POST /api/briefs/public/[accessKey]/submit
 *
 * Завершает заполнение брифа и отправляет уведомления
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendTelegramNotification } from '@/lib/telegram'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accessKey: string }> }
) {
  try {
    const { accessKey } = await params

    if (!accessKey) {
      return NextResponse.json(
        { error: 'Access key is required' },
        { status: 400 }
      )
    }

    // Найти бриф
    const brief = await db.brief.findUnique({
      where: { accessKey },
      include: {
        questions: true,
        answers: true,
        project: {
          include: {
            workspace: {
              include: {
                members: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // Проверить что бриф не был уже завершён
    if (brief.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Brief already completed' },
        { status: 400 }
      )
    }

    // Проверить что все обязательные вопросы заполнены
    const requiredQuestions = brief.questions.filter(q => q.required)
    const answeredQuestionIds = brief.answers.map(a => a.questionId)
    const missingRequired = requiredQuestions.filter(
      q => !answeredQuestionIds.includes(q.id)
    )

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: 'Please answer all required questions',
          missingQuestions: missingRequired.map(q => q.question),
        },
        { status: 400 }
      )
    }

    // Обновить статус брифа
    const completed = await db.brief.update({
      where: { id: brief.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Отправить уведомление в CRM
    await db.notification.create({
      data: {
        userId: brief.project.workspace.members[0].userId, // Первый member workspace
        type: 'TASK_ASSIGNED', // TODO: добавить тип BRIEF_COMPLETED
        title: `Бриф заполнен: ${brief.title}`,
        message: `Клиент ${brief.clientName || 'без имени'} заполнил бриф для проекта ${brief.project.name}`,
        metadata: {
          briefId: brief.id,
          projectId: brief.projectId,
        },
      },
    })

    // Отправить уведомление в Telegram
    try {
      const workspace = brief.project.workspace
      if (workspace.telegramBotToken && workspace.telegramChatId) {
        const message = `
🎯 *Бриф заполнен!*

📋 *Бриф:* ${brief.title}
🎨 *Проект:* ${brief.project.name}
👤 *Клиент:* ${brief.clientName || 'Не указан'}
✅ *Ответов:* ${brief.answers.length} из ${brief.questions.length}

Откройте CRM для просмотра ответов.
        `.trim()

        await sendTelegramNotification(
          workspace.telegramBotToken,
          workspace.telegramChatId,
          message
        )
      }
    } catch (telegramError) {
      console.error('[Submit Brief] Telegram notification error:', telegramError)
      // Не блокируем ответ если Telegram не работает
    }

    return NextResponse.json({
      brief: completed,
      message: 'Brief submitted successfully',
    })
  } catch (error: any) {
    console.error('[Submit Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit brief' },
      { status: 500 }
    )
  }
}
