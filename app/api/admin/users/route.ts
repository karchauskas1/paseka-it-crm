import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Get users in the same workspace
    const users = await db.user.findMany({
      where: {
        workspaces: {
          some: {
            workspaceId: workspace.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        workspaces: {
          where: {
            workspaceId: workspace.id,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Get counts for each user and flatten role
    const usersWithCounts = await Promise.all(
      users.map(async (u) => {
        const tasksCount = await db.task.count({
          where: { assigneeId: u.id, workspaceId: workspace.id },
        })
        const projectsCount = await db.project.count({
          where: {
            tasks: {
              some: { assigneeId: u.id },
            },
            workspaceId: workspace.id,
          },
        })
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          role: u.workspaces?.[0]?.role || 'MEMBER',
          _count: {
            tasks: tasksCount,
            projects: projectsCount,
          },
        }
      })
    )

    return NextResponse.json(usersWithCounts)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and owners can create users
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      )
    }

    // Hash password
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and workspace membership
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        workspaces: {
          create: {
            workspaceId: workspace.id,
            role: role || 'MEMBER',
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        workspaces: {
          where: {
            workspaceId: workspace.id,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    })

    return NextResponse.json({
      ...newUser,
      role: newUser.workspaces?.[0]?.role || 'MEMBER',
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
