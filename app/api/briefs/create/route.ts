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
    console.log('[Create Brief] Starting...')

    const user = await getCurrentUser()
    console.log('[Create Brief] User:', user?.id)

    if (!user) {
      console.log('[Create Brief] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateBriefRequest = await req.json()
    console.log('[Create Brief] Body:', { projectId: body.projectId, title: body.title })

    const { projectId, title, description, accessKey } = body

    if (!projectId || !title || !accessKey) {
      console.log('[Create Brief] Missing required fields')
      return NextResponse.json(
        { error: 'projectId, title, and accessKey are required' },
        { status: 400 }
      )
    }

    // Проверить доступ к проекту
    console.log('[Create Brief] Checking project access...')
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
      console.log('[Create Brief] Project not found or no access')
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    console.log('[Create Brief] Project found, creating brief...')

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

    console.log('[Create Brief] Brief created:', brief.id)
    return NextResponse.json({ brief })
  } catch (error: any) {
    console.error('[Create Brief] Error:', error)
    console.error('[Create Brief] Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to create brief' },
      { status: 500 }
    )
  }
}
