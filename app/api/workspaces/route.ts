import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/permissions'
import { WorkspaceRole } from '@prisma/client'
import { z } from 'zod'

// POST /api/workspaces - Создание нового workspace
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Название команды обязательно'),
  description: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = createWorkspaceSchema.parse(body)

    // Создаём workspace и добавляем пользователя как OWNER
    const workspace = await db.workspace.create({
      data: {
        name: data.name,
        description: data.description || null,
        members: {
          create: {
            userId: user.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(workspace)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Failed to create workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}

// GET /api/workspaces - Получить все workspace пользователя
export async function GET() {
  try {
    const user = await requireAuth()

    const workspaces = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
      },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    const formatted = workspaces.map((m) => ({
      ...m.workspace,
      role: m.role,
      joinedAt: m.joinedAt,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Failed to fetch workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}
