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
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Get full workspace with counts
    const workspaceWithCounts = await db.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
            clients: true,
          },
        },
      },
    })

    return NextResponse.json(workspaceWithCounts)
  } catch (error) {
    console.error('Error fetching workspace:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and owners can update workspace settings
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { name, telegramBotToken, telegramChatId, openRouterApiKey, telegramGroupNotifications } = await req.json()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (telegramBotToken !== undefined) updateData.telegramBotToken = telegramBotToken
    if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId
    if (openRouterApiKey !== undefined) updateData.openRouterApiKey = openRouterApiKey
    if (telegramGroupNotifications !== undefined) updateData.telegramGroupNotifications = telegramGroupNotifications

    const updatedWorkspace = await db.workspace.update({
      where: { id: workspace.id },
      data: updateData,
    })

    return NextResponse.json(updatedWorkspace)
  } catch (error) {
    console.error('Error updating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    )
  }
}
