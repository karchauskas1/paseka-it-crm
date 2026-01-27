/**
 * API для получения брифов проекта
 * GET /api/projects/[id]/briefs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

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

    // Получить все брифы проекта
    const briefs = await db.brief.findMany({
      where: {
        projectId,
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        answers: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ briefs })
  } catch (error: any) {
    console.error('[Get Project Briefs] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get briefs' },
      { status: 500 }
    )
  }
}
