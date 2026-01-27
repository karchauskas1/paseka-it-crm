/**
 * API для работы с вопросами брифа
 * POST /api/briefs/[briefId]/questions - добавить вопрос
 * PUT /api/briefs/[briefId]/questions - обновить вопрос
 * DELETE /api/briefs/[briefId]/questions - удалить вопрос
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BriefQuestionType } from '@prisma/client'

interface QuestionData {
  type: BriefQuestionType
  question: string
  description?: string
  options?: any
  required?: boolean
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
}

// POST - добавить вопрос
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ briefId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { briefId } = await params
    const body: QuestionData = await req.json()

    // Проверить доступ к брифу
    const brief = await db.brief.findFirst({
      where: {
        id: briefId,
        project: {
          workspace: {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        },
      },
      include: {
        questions: true,
      },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // Определить порядок нового вопроса
    const maxOrder = brief.questions.length > 0
      ? Math.max(...brief.questions.map(q => q.order))
      : -1

    // Создать вопрос
    const question = await db.briefQuestion.create({
      data: {
        briefId,
        type: body.type,
        question: body.question,
        description: body.description,
        options: body.options,
        required: body.required ?? false,
        order: maxOrder + 1,
        scaleMin: body.scaleMin,
        scaleMax: body.scaleMax,
        scaleMinLabel: body.scaleMinLabel,
        scaleMaxLabel: body.scaleMaxLabel,
      },
    })

    return NextResponse.json({ question })
  } catch (error: any) {
    console.error('[Add Question] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add question' },
      { status: 500 }
    )
  }
}

// PUT - обновить вопрос
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ briefId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { briefId } = await params
    const body = await req.json()
    const { questionId, ...updates } = body

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      )
    }

    // Проверить доступ
    const question = await db.briefQuestion.findFirst({
      where: {
        id: questionId,
        briefId,
        brief: {
          project: {
            workspace: {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Обновить вопрос
    const updated = await db.briefQuestion.update({
      where: { id: questionId },
      data: updates,
    })

    return NextResponse.json({ question: updated })
  } catch (error: any) {
    console.error('[Update Question] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update question' },
      { status: 500 }
    )
  }
}

// DELETE - удалить вопрос
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ briefId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { briefId } = await params
    const { searchParams } = new URL(req.url)
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      )
    }

    // Проверить доступ
    const question = await db.briefQuestion.findFirst({
      where: {
        id: questionId,
        briefId,
        brief: {
          project: {
            workspace: {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Удалить вопрос
    await db.briefQuestion.delete({
      where: { id: questionId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Question] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete question' },
      { status: 500 }
    )
  }
}
