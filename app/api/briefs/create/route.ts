/**
 * API для создания брифа
 * POST /api/briefs/create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

interface CreateBriefRequest {
  projectId: string
  title: string
  description?: string
  accessKey: string // Пароль, который задаёт пользователь
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateBriefRequest = await req.json()
    const { projectId, title, description, accessKey } = body

    if (!projectId || !title || !accessKey) {
      return NextResponse.json(
        { error: 'projectId, title, and accessKey are required' },
        { status: 400 }
      )
    }

    // Проверить доступ к проекту
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Создать бриф
    const brief = await db.brief.create({
      data: {
        projectId,
        title,
        description,
        accessKey, // Пароль задаётся пользователем
        status: 'DRAFT',
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

    return NextResponse.json({ brief })
  } catch (error: any) {
    console.error('[Create Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create brief' },
      { status: 500 }
    )
  }
}
