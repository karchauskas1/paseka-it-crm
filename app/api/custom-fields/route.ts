import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET all custom fields for a workspace and entity type
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const entityType = searchParams.get('entityType')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const where: any = { workspaceId }
    if (entityType) {
      where.entityType = entityType
    }

    const fields = await db.customField.findMany({
      where,
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ fields })
  } catch (error) {
    console.error('Get custom fields error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST create a new custom field
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember || !['ADMIN', 'OWNER'].includes(workspaceMember.role)) {
      return NextResponse.json(
        { error: 'Only admins can create custom fields' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { workspaceId, entityType, name, fieldType, options, required, order } = body

    if (!workspaceId || !entityType || !name || !fieldType) {
      return NextResponse.json(
        { error: 'workspaceId, entityType, name, and fieldType are required' },
        { status: 400 }
      )
    }

    const field = await db.customField.create({
      data: {
        workspaceId,
        entityType,
        name,
        fieldType,
        options: options || null,
        required: required || false,
        order: order || 0,
      },
    })

    return NextResponse.json({ field })
  } catch (error) {
    console.error('Create custom field error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
