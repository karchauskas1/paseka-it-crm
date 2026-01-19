import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET a single custom field
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

    const field = await db.customField.findUnique({
      where: { id },
    })

    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }

    return NextResponse.json({ field })
  } catch (error) {
    console.error('Get custom field error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH update a custom field
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'Only admins can update custom fields' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const { name, fieldType, options, required, order } = body

    const field = await db.customField.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(fieldType && { fieldType }),
        ...(options !== undefined && { options }),
        ...(required !== undefined && { required }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json({ field })
  } catch (error) {
    console.error('Update custom field error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE a custom field
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'Only admins can delete custom fields' },
        { status: 403 }
      )
    }

    const { id } = await params

    await db.customField.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete custom field error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
