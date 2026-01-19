import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'MEMBER',
      },
    })

    // Create default workspace for first user
    const userCount = await db.user.count()
    if (userCount === 1) {
      const workspace = await db.workspace.create({
        data: {
          name: 'Default Workspace',
          description: 'Your primary workspace',
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      })
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
