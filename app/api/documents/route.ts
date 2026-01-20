import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const documents = await db.document.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Get documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const type = formData.get('type') as string || 'OTHER'

    if (!file || !projectId) {
      return NextResponse.json({ error: 'file and projectId are required' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max size: 10MB' }, { status: 400 })
    }

    // Convert file to base64 for storage (in production, use S3/Cloudinary)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Get current version
    const existingDocs = await db.document.findMany({
      where: { projectId, name: file.name },
      orderBy: { version: 'desc' },
      take: 1,
    })
    const version = existingDocs.length > 0 ? existingDocs[0].version + 1 : 1

    const document = await db.document.create({
      data: {
        projectId,
        name: file.name,
        type: type as any,
        url: dataUrl,
        size: file.size,
        mimeType,
        version,
        uploadedById: user.id,
      },
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
