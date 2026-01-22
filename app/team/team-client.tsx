'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/layout'
import { Users, CheckCircle, Clock, UserPlus } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
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

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/team" userRole={user.role}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {members.length} участников
            </h2>
            <p className="text-sm text-muted-foreground">
              Команда {workspace.name}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Link href="/admin">
            <Button size="sm" className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Пригласить</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-card rounded-lg shadow border overflow-hidden touch-manipulation"
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-base sm:text-lg shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{member.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>
                <Badge className={`${roleColors[member.workspaceRole]} text-xs shrink-0`}>
                  {roleLabels[member.workspaceRole]}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{member.stats.total}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Всего</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{member.stats.completed}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-0.5 sm:gap-1">
                    <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">Выполнено</span>
                    <span className="sm:hidden">Готово</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{member.stats.inProgress}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-0.5 sm:gap-1">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">В работе</span>
                    <span className="sm:hidden">В работе</span>
                  </p>
                </div>
              </div>

              {/* Completion rate */}
              {member.stats.total > 0 && (
                <div className="mt-3 sm:mt-4">
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-muted-foreground">Выполнение</span>
                    <span className="font-medium">
                      {Math.round((member.stats.completed / member.stats.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
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
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">В команде пока никого нет</p>
        </div>
      )}
    </AppLayout>
  )
}
