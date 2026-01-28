/**
 * API для общих файлов workspace (хранилище)
 * GET /api/files - список всех файлов (и проектных, и общих)
 * POST /api/files - загрузить общий файл в workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { put } from '@vercel/blob'

// Получить все файлы workspace (и проектные, и общие)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Найти workspace пользователя
    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const workspaceId = workspaceMember.workspaceId

    // Получить общие файлы workspace
    const workspaceFiles = await db.projectFile.findMany({
      where: {
        workspaceId,
        projectId: null,
      },
      include: {
        uploadedBy: {
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

    // Получить все проекты с их файлами
    const projects = await db.project.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        files: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    return NextResponse.json({
      workspaceFiles,
      projects,
    })
  } catch (error: any) {
    console.error('[Get All Files] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get files' },
      { status: 500 }
    )
  }
}

// Загрузить общий файл в workspace
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Найти workspace пользователя
    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const workspaceId = workspaceMember.workspaceId

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
    const blob = await put(`workspace/${workspaceId}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Создаем запись в БД (без projectId - общий файл)
    const workspaceFile = await db.projectFile.create({
      data: {
        workspaceId,
        projectId: null,
        name: file.name,
        description: description || null,
        url: blob.url,
        size: file.size,
        mimeType: file.type,
        category: category || null,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ file: workspaceFile }, { status: 201 })
  } catch (error: any) {
    console.error('[Upload Workspace File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
