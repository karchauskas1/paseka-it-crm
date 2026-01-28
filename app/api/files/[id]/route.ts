/**
 * API для работы с отдельным файлом
 * GET /api/files/[id] - получить файл
 * PATCH /api/files/[id] - обновить метаданные
 * DELETE /api/files/[id] - удалить файл
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { del } from '@vercel/blob'

// Получить файл
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await params

    // Найти workspace пользователя
    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const file = await db.projectFile.findFirst({
      where: {
        id: fileId,
        workspaceId: workspaceMember.workspaceId,
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
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json({ file })
  } catch (error: any) {
    console.error('[Get File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get file' },
      { status: 500 }
    )
  }
}

// Обновить метаданные файла
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await params
    const body = await req.json()
    const { name, description, category } = body

    // Найти workspace пользователя
    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Проверить что файл принадлежит workspace и это общий файл
    const existingFile = await db.projectFile.findFirst({
      where: {
        id: fileId,
        workspaceId: workspaceMember.workspaceId,
        projectId: null,
      },
    })

    if (!existingFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const updatedFile = await db.projectFile.update({
      where: { id: fileId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
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

    return NextResponse.json({ file: updatedFile })
  } catch (error: any) {
    console.error('[Update File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update file' },
      { status: 500 }
    )
  }
}

// Удалить файл
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await params

    // Найти workspace пользователя
    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Проверить что файл принадлежит workspace и это общий файл
    const file = await db.projectFile.findFirst({
      where: {
        id: fileId,
        workspaceId: workspaceMember.workspaceId,
        projectId: null,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Удалить файл из Vercel Blob (если URL от blob.vercel-storage.com)
    if (file.url.includes('blob.vercel-storage.com')) {
      try {
        await del(file.url)
      } catch (e) {
        console.error('Failed to delete blob:', e)
      }
    }

    // Удалить запись из БД
    await db.projectFile.delete({
      where: { id: fileId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete File] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    )
  }
}
