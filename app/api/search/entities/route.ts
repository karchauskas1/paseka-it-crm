import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/search/entities - Search for tasks, projects, clients for / mentions
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim() || ''
    const type = searchParams.get('type') // 'task', 'project', 'client', or undefined for all
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25)

    // Get user's workspace
    const membership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const results: Array<{
      id: string
      type: 'task' | 'project' | 'client'
      name: string
      subtitle?: string
      status?: string
    }> = []

    // Search tasks
    if (!type || type === 'task') {
      const tasks = await db.task.findMany({
        where: {
          project: {
            workspaceId: membership.workspaceId,
          },
          OR: query
            ? [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ]
            : undefined,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          project: {
            select: { name: true },
          },
        },
      })

      tasks.forEach((task) => {
        results.push({
          id: task.id,
          type: 'task',
          name: task.title,
          subtitle: task.project?.name,
          status: task.status,
        })
      })
    }

    // Search projects
    if (!type || type === 'project') {
      const projects = await db.project.findMany({
        where: {
          workspaceId: membership.workspaceId,
          OR: query
            ? [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ]
            : undefined,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          client: {
            select: { name: true },
          },
        },
      })

      projects.forEach((project) => {
        results.push({
          id: project.id,
          type: 'project',
          name: project.name,
          subtitle: project.client?.name,
          status: project.status,
        })
      })
    }

    // Search clients
    if (!type || type === 'client') {
      const clients = await db.client.findMany({
        where: {
          workspaceId: membership.workspaceId,
          OR: query
            ? [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { company: { contains: query, mode: 'insensitive' } },
              ]
            : undefined,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          company: true,
        },
      })

      clients.forEach((client) => {
        results.push({
          id: client.id,
          type: 'client',
          name: client.name,
          subtitle: client.company || undefined,
        })
      })
    }

    // Sort by relevance (exact match first, then by type priority: task > project > client)
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === query.toLowerCase()
      const bExact = b.name.toLowerCase() === query.toLowerCase()
      if (aExact !== bExact) return aExact ? -1 : 1

      const typePriority = { task: 0, project: 1, client: 2 }
      return typePriority[a.type] - typePriority[b.type]
    })

    return NextResponse.json({
      results: results.slice(0, limit),
      query,
    })
  } catch (error) {
    console.error('Search entities error:', error)
    return NextResponse.json(
      { error: 'Failed to search entities' },
      { status: 500 }
    )
  }
}
