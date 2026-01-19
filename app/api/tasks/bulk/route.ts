import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * PATCH /api/tasks/bulk
 * Массовое обновление задач
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { taskIds, update } = await req.json()

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'taskIds array is required' },
        { status: 400 }
      )
    }

    if (!update || typeof update !== 'object') {
      return NextResponse.json(
        { error: 'update object is required' },
        { status: 400 }
      )
    }

    // Validate allowed fields
    const allowedFields = ['status', 'priority', 'assigneeId', 'dueDate']
    const updateData: any = {}

    for (const [key, value] of Object.entries(update)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Verify all tasks belong to workspace
    const tasks = await db.task.findMany({
      where: {
        id: { in: taskIds },
        workspaceId: workspace.id,
      },
      select: { id: true },
    })

    const validTaskIds = tasks.map((t) => t.id)

    if (validTaskIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid tasks found' },
        { status: 404 }
      )
    }

    // Perform bulk update
    const result = await db.task.updateMany({
      where: {
        id: { in: validTaskIds },
        workspaceId: workspace.id,
      },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  } catch (error) {
    console.error('Error bulk updating tasks:', error)
    return NextResponse.json(
      { error: 'Failed to update tasks' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/bulk
 * Массовое удаление задач
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { taskIds } = await req.json()

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'taskIds array is required' },
        { status: 400 }
      )
    }

    // Verify all tasks belong to workspace
    const tasks = await db.task.findMany({
      where: {
        id: { in: taskIds },
        workspaceId: workspace.id,
      },
      select: { id: true },
    })

    const validTaskIds = tasks.map((t) => t.id)

    if (validTaskIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid tasks found' },
        { status: 404 }
      )
    }

    // Delete time entries
    await db.timeEntry.deleteMany({
      where: { taskId: { in: validTaskIds } },
    })

    // Delete comments
    await db.comment.deleteMany({
      where: { taskId: { in: validTaskIds } },
    })

    // Delete tasks
    const result = await db.task.deleteMany({
      where: {
        id: { in: validTaskIds },
        workspaceId: workspace.id,
      },
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
    })
  } catch (error) {
    console.error('Error bulk deleting tasks:', error)
    return NextResponse.json(
      { error: 'Failed to delete tasks' },
      { status: 500 }
    )
  }
}
