import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET all touches for workspace
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {
      workspaceId: workspaceMember.workspaceId,
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const touches = await db.touch.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ touches })
  } catch (error) {
    console.error('Get touches error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch touches' },
      { status: 500 }
    )
  }
}

// POST create new touch
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
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
      description,
      sentMessage,
      followUpAt,
    } = body

    if (!contactName) {
      return NextResponse.json(
        { error: 'Имя контакта обязательно' },
        { status: 400 }
      )
    }

    const touch = await db.touch.create({
      data: {
        workspaceId: workspaceMember.workspaceId,
        contactName,
        contactEmail,
        contactPhone,
        contactCompany,
        contactPosition,
        industry,
        socialMedia,
        source,
        description,
        sentMessage,
        followUpAt: followUpAt ? new Date(followUpAt) : undefined,
        createdById: user.id,
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

    return NextResponse.json({ touch })
  } catch (error: any) {
    console.error('Create touch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create touch' },
      { status: 500 }
    )
  }
}
