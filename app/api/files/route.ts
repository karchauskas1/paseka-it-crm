/**
 * API для общих файлов workspace (хранилище)
 * GET /api/files - список всех файлов (и проектных, и общих)
 * POST /api/files - загрузить общий файл в workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'workspace')

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

    // Создать папку для workspace если не существует
    const workspaceDir = path.join(UPLOAD_DIR, workspaceId)
    if (!existsSync(workspaceDir)) {
      await mkdir(workspaceDir, { recursive: true })
    }

    // Генерируем уникальное имя файла
    const ext = path.extname(file.name)
    const uniqueName = `${uuidv4()}${ext}`
    const filePath = path.join(workspaceDir, uniqueName)

    // Сохраняем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // URL для доступа к файлу
    const fileUrl = `/uploads/workspace/${workspaceId}/${uniqueName}`

    // Создаем запись в БД (без projectId - общий файл)
    const workspaceFile = await db.projectFile.create({
      data: {
        workspaceId,
        projectId: null,
        name: file.name,
        description: description || null,
        url: fileUrl,
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
