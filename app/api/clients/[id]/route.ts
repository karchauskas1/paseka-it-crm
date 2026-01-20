import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logUpdate, logDelete } from '@/lib/activity-logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    const client = await db.client.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
      include: {
        projects: {
          include: {
            _count: {
              select: { tasks: true },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Добавить fallback для socialLinks и customFields (для обратной совместимости)
    const clientWithDefaults = {
      ...client,
      socialLinks: client.socialLinks || [],
      customFields: client.customFields || {},
    }

    return NextResponse.json(clientWithDefaults)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    // Check if client belongs to user's workspace
    const existingClient = await db.client.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { name, company, email, phone, source, status, notes, socialLinks } = await req.json()

    const client = await db.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(company !== undefined && { company }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(source !== undefined && { source }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(socialLinks !== undefined && { socialLinks }),
      },
    })

    // Log activity
    const oldData = { name: existingClient.name, company: existingClient.company }
    const newData = { name, company }
    await logUpdate('client', client.id, oldData, newData, user.id, { workspaceId: workspaceMember.workspaceId })

    // Notify team if important field changed (name or status)
    if (name && name !== existingClient.name) {
      const teamMembers = await db.workspaceMember.findMany({
        where: { workspaceId: workspaceMember.workspaceId },
        select: { userId: true },
      })

      const userName = user.name || user.email
      await Promise.all(
        teamMembers
          .filter(m => m.userId !== user.id)
          .map(member =>
            db.notification.create({
              data: {
                userId: member.userId,
                type: 'PROJECT_STATUS_CHANGED',
                title: 'Клиент обновлён',
                message: `${userName} изменил клиента "${existingClient.name}" на "${name}"`,
                entityType: 'client',
                entityId: client.id,
              },
            })
          )
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    // Check if client belongs to user's workspace
    const existingClient = await db.client.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Prevent deletion if client has projects
    if (existingClient._count.projects > 0) {
      return NextResponse.json(
        { error: 'Невозможно удалить клиента с существующими проектами. Сначала удалите проекты.' },
        { status: 400 }
      )
    }

    // Log activity before deletion
    await logDelete('client', id, { name: existingClient.name, company: existingClient.company }, user.id, { workspaceId: workspaceMember.workspaceId })

    await db.client.delete({
      where: { id },
    })

    // Notify team
    const teamMembers = await db.workspaceMember.findMany({
      where: { workspaceId: workspaceMember.workspaceId },
      select: { userId: true },
    })

    const userName = user.name || user.email
    await Promise.all(
      teamMembers
        .filter(m => m.userId !== user.id)
        .map(member =>
          db.notification.create({
            data: {
              userId: member.userId,
              type: 'PROJECT_STATUS_CHANGED',
              title: 'Клиент удалён',
              message: `${userName} удалил клиента "${existingClient.name}"`,
              entityType: 'client',
              entityId: id,
            },
          })
        )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
