/**
 * API для работы с брифом
 * GET /api/briefs/[briefId] - получить бриф
 * PUT /api/briefs/[briefId] - обновить бриф (название, описание)
 * DELETE /api/briefs/[briefId] - удалить бриф
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - получить бриф
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ briefId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { briefId } = await params

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
            id: true,
            name: true,
            workspaceId: true,
          },
        },
      },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    return NextResponse.json({ brief })
  } catch (error: any) {
    console.error('[Get Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get brief' },
      { status: 500 }
    )
  }
}

// PUT - обновить бриф
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
    const { title, description, accessKey } = body

    // Проверить доступ
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
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // Обновить бриф
    const updated = await db.brief.update({
      where: { id: briefId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(accessKey && { accessKey }),
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        answers: true,
      },
    })

    return NextResponse.json({ brief: updated })
  } catch (error: any) {
    console.error('[Update Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update brief' },
      { status: 500 }
    )
  }
}

// DELETE - удалить бриф
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

    // Проверить доступ
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
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // Удалить бриф (каскадом удалятся вопросы и ответы)
    await db.brief.delete({
      where: { id: briefId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete brief' },
      { status: 500 }
    )
  }
}
