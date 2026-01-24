import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET single touch
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

    const touch = await db.touch.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!touch) {
      return NextResponse.json({ error: 'Touch not found' }, { status: 404 })
    }

    return NextResponse.json({ touch })
  } catch (error) {
    console.error('Get touch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch touch' },
      { status: 500 }
    )
  }
}

// PATCH update touch
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

    const existingTouch = await db.touch.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
    })

    if (!existingTouch) {
      return NextResponse.json({ error: 'Touch not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      contactName,
      contactEmail,
      contactPhone,
      contactCompany,
      contactPosition,
      industry,
      socialMedia,
      source,
      status,
      description,
      response,
      followUpAt,
    } = body

    const updateData: any = {}

    if (contactName !== undefined) updateData.contactName = contactName
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone
    if (contactCompany !== undefined) updateData.contactCompany = contactCompany
    if (contactPosition !== undefined) updateData.contactPosition = contactPosition
    if (industry !== undefined) updateData.industry = industry
    if (socialMedia !== undefined) updateData.socialMedia = socialMedia
    if (source !== undefined) updateData.source = source
    if (description !== undefined) updateData.description = description
    if (response !== undefined) updateData.response = response
    if (followUpAt !== undefined) updateData.followUpAt = followUpAt ? new Date(followUpAt) : null

    if (status !== undefined) {
      updateData.status = status
      if (status === 'RESPONDED' && !existingTouch.respondedAt) {
        updateData.respondedAt = new Date()
      }
    }

    const touch = await db.touch.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ touch })
  } catch (error) {
    console.error('Update touch error:', error)
    return NextResponse.json(
      { error: 'Failed to update touch' },
      { status: 500 }
    )
  }
}

// DELETE touch
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

    const existingTouch = await db.touch.findFirst({
      where: {
        id,
        workspaceId: workspaceMember.workspaceId,
      },
    })

    if (!existingTouch) {
      return NextResponse.json({ error: 'Touch not found' }, { status: 404 })
    }

    await db.touch.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete touch error:', error)
    return NextResponse.json(
      { error: 'Failed to delete touch' },
      { status: 500 }
    )
  }
}
