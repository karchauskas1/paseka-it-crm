import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST convert touch to client
export async function POST(
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
    })

    if (!touch) {
      return NextResponse.json({ error: 'Touch not found' }, { status: 404 })
    }

    if (touch.convertedToClientId) {
      return NextResponse.json(
        { error: 'Это касание уже конвертировано в клиента' },
        { status: 400 }
      )
    }

    // Create client from touch data
    const client = await db.client.create({
      data: {
        workspaceId: workspaceMember.workspaceId,
        name: touch.contactName,
        email: touch.contactEmail,
        phone: touch.contactPhone,
        company: touch.contactCompany,
        source: 'COLD', // Default source for converted touches
        notes: touch.description ? `Из касания: ${touch.description}` : undefined,
        createdById: user.id,
      },
    })

    // Update touch with conversion info
    await db.touch.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedToClientId: client.id,
        convertedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      client,
      message: 'Касание успешно конвертировано в клиента',
    })
  } catch (error) {
    console.error('Convert touch error:', error)
    return NextResponse.json(
      { error: 'Failed to convert touch' },
      { status: 500 }
    )
  }
}
