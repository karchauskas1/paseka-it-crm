'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserMenu } from '@/components/layout/user-menu'
import { Home, Users, CheckCircle, Clock, UserPlus } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  workspaceRole: string
  createdAt: string
  stats: {
    total: number
    completed: number
    inProgress: number
  }
}

interface TeamClientProps {
  user: any
  workspace: any
  members: TeamMember[]
}

const roleLabels: Record<string, string> = {
  VIEWER: 'Наблюдатель',
  MEMBER: 'Участник',
  ADMIN: 'Администратор',
  OWNER: 'Владелец',
}

const roleColors: Record<string, string> = {
  VIEWER: 'bg-gray-100 text-gray-700',
  MEMBER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  OWNER: 'bg-amber-100 text-amber-700',
}

export default function TeamClient({ user, workspace, members }: TeamClientProps) {
  const router = useRouter()
  const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER'

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center">
                  <Home className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900">Команда</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Команда</h1>
              <p className="text-sm text-gray-600">{workspace.name}</p>
            </div>
            <UserMenu user={user} workspace={workspace} userRole={user.role} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Проекты
            </Link>
            <Link
              href="/clients"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Клиенты
            </Link>
            <Link
              href="/tasks"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Задачи
            </Link>
            <Link
              href="/team"
              className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
            >
              Команда
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="text-xl font-semibold">{members.length} участников</h2>
              <p className="text-sm text-gray-500">Команда workspace {workspace.name}</p>
            </div>
          </div>
          {isAdmin && (
            <Link href="/admin">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Пригласить
              </Button>
            </Link>
          )}
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg shadow border overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <Badge className={roleColors[member.workspaceRole]}>
                    {roleLabels[member.workspaceRole]}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{member.stats.total}</p>
                    <p className="text-xs text-gray-500">Всего задач</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{member.stats.completed}</p>
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Выполнено
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{member.stats.inProgress}</p>
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      В работе
                    </p>
                  </div>
                </div>

                {/* Completion rate */}
                {member.stats.total > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Выполнение</span>
                      <span className="font-medium">
                        {Math.round((member.stats.completed / member.stats.total) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{
                          width: `${(member.stats.completed / member.stats.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">В команде пока никого нет</p>
          </div>
        )}
      </main>
    </div>
  )
}
