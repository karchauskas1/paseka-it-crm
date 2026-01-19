import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

export interface SessionPayload {
  userId: string
  email: string
  role: string
  [key: string]: unknown
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return null

  return verifySession(token)
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      telegramId: true,
      createdAt: true,
      workspaces: {
        select: {
          role: true,
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 1, // Берём первый workspace пользователя
      },
    },
  })

  if (!user) return null

  // Возвращаем пользователя с ролью из WorkspaceMember
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    telegramId: user.telegramId,
    createdAt: user.createdAt,
    role: user.workspaces?.[0]?.role || 'MEMBER',
    workspace: user.workspaces?.[0]?.workspace,
  }
}

export async function getUserWorkspace(userId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  })

  return membership?.workspace || null
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
