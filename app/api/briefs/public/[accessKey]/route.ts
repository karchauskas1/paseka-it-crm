/**
 * Публичный API для получения брифа клиентом
 * GET /api/briefs/public/[accessKey]
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

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { accessKey } = context.params

    if (!accessKey) {
      return NextResponse.json(
        { error: 'Access key is required' },
        { status: 400 }
      )
    }

    // Найти бриф по accessKey
    const brief = await db.brief.findUnique({
      where: {
        accessKey,
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
        project: {
          select: {
            name: true,
            workspace: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // Если бриф ещё не отправлен (DRAFT), не показываем
    if (brief.status === 'DRAFT') {
      return NextResponse.json(
        { error: 'Brief is not available yet' },
        { status: 403 }
      )
    }

    // Если статус SENT, обновляем на IN_PROGRESS
    if (brief.status === 'SENT') {
      await db.brief.update({
        where: { id: brief.id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    return NextResponse.json({ brief })
  } catch (error: any) {
    console.error('[Get Public Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get brief' },
      { status: 500 }
    )
  }
}
