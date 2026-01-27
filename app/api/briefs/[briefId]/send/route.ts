/**
 * API для отправки брифа клиенту
 * POST /api/briefs/[briefId]/send
 *
 * Изменяет статус на SENT и возвращает публичную ссылку
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface RouteContext {
  params: {
    briefId: string
  }
}

interface SendBriefRequest {
  clientName?: string
  clientEmail?: string
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { briefId } = context.params
    const body: SendBriefRequest = await req.json()

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

    // Проверить что есть хотя бы один вопрос
    if (brief.questions.length === 0) {
      return NextResponse.json(
        { error: 'Cannot send empty brief. Add at least one question.' },
        { status: 400 }
      )
    }

    // Обновить статус и информацию о клиенте
    const updated = await db.brief.update({
      where: { id: briefId },
      data: {
        status: 'SENT',
        clientName: body.clientName,
        clientEmail: body.clientEmail,
      },
    })

    // Сформировать публичную ссылку
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const publicUrl = `${appUrl}/brief/${updated.accessKey}`

    return NextResponse.json({
      brief: updated,
      publicUrl,
      message: 'Brief sent to client',
    })
  } catch (error: any) {
    console.error('[Send Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send brief' },
      { status: 500 }
    )
  }
}
