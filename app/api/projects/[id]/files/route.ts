/**
 * API для файлов проекта
 * GET /api/projects/[id]/files - список файлов
 * POST /api/projects/[id]/files - загрузить файл
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { put } from '@vercel/blob'

// Получить список файлов проекта
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Проверить доступ к проекту
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Получить все файлы проекта
    const files = await db.projectFile.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ files })
  } catch (error: any) {
    console.error('[Get Project Files] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get files' },
      { status: 500 }
    )
  }
}

// Загрузить новый файл
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Проверить доступ к проекту
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null
    const category = formData.get('category') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Проверка размера файла (макс 50MB)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      )
    }

    // Загружаем файл в Vercel Blob
    const blob = await put(`projects/${projectId}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Создаем запись в БД
    const projectFile = await db.projectFile.create({
      data: {
        projectId,
        name: file.name,
        description: description || null,
        url: blob.url,
        size: file.size,
        mimeType: file.type,
        category: category || null,
        uploadedById: user.id,
      },
    })

    return NextResponse.json({ file: projectFile }, { status: 201 })
  } catch (error: any) {
    console.error('[Upload Project File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
