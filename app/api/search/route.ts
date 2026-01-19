import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * GET /api/search?q=текст
 * Глобальный поиск по проектам, клиентам, задачам
 */
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
    const query = searchParams.get('q')?.trim()
    const limit = parseInt(searchParams.get('limit') || '5', 10)

    if (!query || query.length < 2) {
      return NextResponse.json({
        projects: [],
        clients: [],
        tasks: [],
      })
    }

    // Поиск по всем сущностям параллельно
    const [projects, clients, tasks] = await Promise.all([
      // Поиск проектов
      db.project.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          client: {
            select: {
              name: true,
            },
          },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),

      // Поиск клиентов
      db.client.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),

      // Поиск задач
      db.task.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      projects,
      clients,
      tasks,
    })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}
