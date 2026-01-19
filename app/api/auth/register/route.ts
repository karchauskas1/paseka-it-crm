import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'
import { WorkspaceRole } from '@prisma/client'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть минимум 6 символов'),
  name: z.string().min(1, 'Имя обязательно'),

  // Опции для создания или присоединения к workspace
  action: z.enum(['create', 'join']),

  // Для создания workspace
  workspaceName: z.string().optional(),
  workspaceDescription: z.string().optional(),

  // Для присоединения к workspace
  inviteToken: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Проверяем существование пользователя
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(data.password)

    // Создаём пользователя
    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    })

    let workspace
    let workspaceRole: WorkspaceRole = WorkspaceRole.MEMBER

    if (data.action === 'create') {
      // Создаём новый workspace
      if (!data.workspaceName) {
        return NextResponse.json(
          { error: 'Название команды обязательно' },
          { status: 400 }
        )
      }

      workspace = await db.workspace.create({
        data: {
          name: data.workspaceName,
          description: data.workspaceDescription || null,
          members: {
            create: {
              userId: user.id,
              role: WorkspaceRole.OWNER,
            },
          },
        },
      })

      workspaceRole = WorkspaceRole.OWNER
    } else if (data.action === 'join') {
      // Присоединяемся к существующему workspace по инвайту
      if (!data.inviteToken) {
        return NextResponse.json(
          { error: 'Токен приглашения обязателен' },
          { status: 400 }
        )
      }

      const invite = await db.invite.findUnique({
        where: { token: data.inviteToken },
        include: {
          workspace: true,
        },
      })

      if (!invite) {
        return NextResponse.json(
          { error: 'Приглашение не найдено' },
          { status: 404 }
        )
      }

      if (invite.usedAt) {
        return NextResponse.json(
          { error: 'Приглашение уже использовано' },
          { status: 410 }
        )
      }

      if (new Date() > invite.expiresAt) {
        return NextResponse.json(
          { error: 'Срок действия приглашения истёк' },
          { status: 410 }
        )
      }

      // Если инвайт привязан к email, проверяем совпадение
      if (invite.email && invite.email !== data.email) {
        return NextResponse.json(
          { error: 'Это приглашение предназначено для другого email' },
          { status: 403 }
        )
      }

      // Добавляем пользователя в workspace
      await db.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      })

      // Помечаем инвайт как использованный
      await db.invite.update({
        where: { token: data.inviteToken },
        data: {
          usedAt: new Date(),
          usedById: user.id,
        },
      })

      workspace = invite.workspace
      workspaceRole = invite.role
    } else {
      return NextResponse.json(
        { error: 'Некорректное действие' },
        { status: 400 }
      )
    }

    // Создаём сессию
    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: workspaceRole, // Используем роль в workspace
    })

    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      role: workspaceRole,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
