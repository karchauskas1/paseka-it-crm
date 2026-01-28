/**
 * API для работы с отдельным файлом проекта
 * GET /api/projects/[id]/files/[fileId] - получить файл
 * PATCH /api/projects/[id]/files/[fileId] - обновить описание/категорию
 * DELETE /api/projects/[id]/files/[fileId] - удалить файл
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

// Получить информацию о файле
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, fileId } = await params

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

    const file = await db.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json({ file })
  } catch (error: any) {
    console.error('[Get Project File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get file' },
      { status: 500 }
    )
  }
}

// Обновить описание/категорию файла
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, fileId } = await params
    const body = await req.json()

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

    // Проверить что файл существует
    const existingFile = await db.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
      },
    })

    if (!existingFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Обновить файл
    const updatedFile = await db.projectFile.update({
      where: {
        id: fileId,
      },
      data: {
        description: body.description !== undefined ? body.description : existingFile.description,
        category: body.category !== undefined ? body.category : existingFile.category,
        name: body.name !== undefined ? body.name : existingFile.name,
      },
    })

    return NextResponse.json({ file: updatedFile })
  } catch (error: any) {
    console.error('[Update Project File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update file' },
      { status: 500 }
    )
  }
}

// Удалить файл
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, fileId } = await params

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

    // Получить файл
    const file = await db.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Удалить физический файл
    try {
      const filePath = path.join(process.cwd(), 'public', file.url)
      await unlink(filePath)
    } catch (e) {
      // Файл может уже не существовать, игнорируем
      console.warn('[Delete Project File] Could not delete physical file:', e)
    }

    // Удалить запись из БД
    await db.projectFile.delete({
      where: {
        id: fileId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Project File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    )
  }
}
