import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const whereClause: any = {
      workspaceId: workspace.id,
      isArchived: true,
    }

    if (projectId) {
      whereClause.projectId = projectId
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where: whereClause,
        include: {
          project: {
            select: { id: true, name: true },
          },
          assignee: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { archivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.task.count({ where: whereClause }),
    ])

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching archived tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch archived tasks' },
      { status: 500 }
    )
  }
}
