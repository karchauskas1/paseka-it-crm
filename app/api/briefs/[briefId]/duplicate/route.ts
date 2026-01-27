/**
 * API для дублирования брифа
 * POST /api/briefs/[briefId]/duplicate - создать копию брифа
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

function generateAccessKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// POST - дублировать бриф
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

    // Получить исходный бриф с вопросами
    const sourceBrief = await db.brief.findFirst({
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
        project: true,
      },
    })

    if (!sourceBrief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // Создать копию брифа
    const newBrief = await db.brief.create({
      data: {
        projectId: sourceBrief.projectId,
        title: `${sourceBrief.title} (копия)`,
        description: sourceBrief.description,
        accessKey: generateAccessKey(),
        status: 'DRAFT',
        questions: {
          create: sourceBrief.questions.map((q) => ({
            type: q.type,
            question: q.question,
            description: q.description,
            options: q.options as any,
            required: q.required,
            order: q.order,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
            scaleMinLabel: q.scaleMinLabel,
            scaleMaxLabel: q.scaleMaxLabel,
          })),
        },
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

    return NextResponse.json({ brief: newBrief })
  } catch (error: any) {
    console.error('[Duplicate Brief] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate brief' },
      { status: 500 }
    )
  }
}
