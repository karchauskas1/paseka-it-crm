/**
 * Публичный API для сохранения ответов клиента (черновик)
 * POST /api/briefs/public/[accessKey]/answer
 *
 * Не требует авторизации, доступ по accessKey
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteContext {
  params: {
    accessKey: string
  }
}

interface SaveAnswerRequest {
  questionId: string
  answer: any
  files?: string[]
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { accessKey } = context.params
    const body: SaveAnswerRequest = await req.json()

    if (!accessKey || !body.questionId) {
      return NextResponse.json(
        { error: 'Access key and questionId are required' },
        { status: 400 }
      )
    }

    // Найти бриф
    const brief = await db.brief.findUnique({
      where: { accessKey },
      include: {
        questions: true,
      },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // Проверить что бриф не завершён
    if (brief.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Brief already completed' },
        { status: 400 }
      )
    }

    // Проверить что вопрос существует в этом брифе
    const question = brief.questions.find(q => q.id === body.questionId)
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Сохранить или обновить ответ (upsert)
    const answer = await db.briefAnswer.upsert({
      where: {
        briefId_questionId: {
          briefId: brief.id,
          questionId: body.questionId,
        },
      },
      create: {
        briefId: brief.id,
        questionId: body.questionId,
        answer: body.answer,
        files: body.files || [],
      },
      update: {
        answer: body.answer,
        files: body.files || [],
        answeredAt: new Date(),
      },
    })

    return NextResponse.json({ answer, message: 'Answer saved' })
  } catch (error: any) {
    console.error('[Save Answer] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save answer' },
      { status: 500 }
    )
  }
}
