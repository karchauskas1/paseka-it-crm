'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { WorkspaceMember } from '@/lib/hooks/use-chat'

interface ChatSidebarProps {
  members: WorkspaceMember[]
  currentUserId: string
}

export function ChatSidebar({ members, currentUserId }: ChatSidebarProps) {
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }

  const formatLastSeen = (lastSeenAt: string | null, isOnline: boolean) => {
    if (isOnline) return 'онлайн'
    if (!lastSeenAt) return 'не в сети'

    const date = new Date(lastSeenAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    // Less than a minute
    if (diffMins < 1) return 'только что'

    // Less than an hour - show minutes
    if (diffMins < 60) {
      return `был ${diffMins} мин. назад`
    }

    // Less than a day - show time
    if (diffMins < 1440) {
      return `был в ${date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    }

    // More than a day
    return `был ${formatDistanceToNow(date, { locale: ru, addSuffix: true })}`
  }

  const onlineMembers = members.filter((m) => m.isOnline)
  const offlineMembers = members.filter((m) => !m.isOnline)

  return (
    <div className="w-64 border-l bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Участники</h3>
        <p className="text-xs text-muted-foreground">
          {onlineMembers.length} онлайн из {members.length}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Online members */}
          {onlineMembers.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
                Онлайн — {onlineMembers.length}
              </div>
              <div className="space-y-0.5">
                {onlineMembers.map((member) => (
                  <MemberItem
                    key={member.userId}
                    member={member}
                    isCurrentUser={member.userId === currentUserId}
                    getInitials={getInitials}
                    formatLastSeen={formatLastSeen}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Offline members */}
          {offlineMembers.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
                Не в сети — {offlineMembers.length}
              </div>
              <div className="space-y-0.5">
                {offlineMembers.map((member) => (
                  <MemberItem
                    key={member.userId}
                    member={member}
                    isCurrentUser={member.userId === currentUserId}
                    getInitials={getInitials}
                    formatLastSeen={formatLastSeen}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface MemberItemProps {
  member: WorkspaceMember
  isCurrentUser: boolean
  getInitials: (name: string | null, email: string) => string
  formatLastSeen: (lastSeenAt: string | null, isOnline: boolean) => string
}

function MemberItem({
  member,
  isCurrentUser,
  getInitials,
  formatLastSeen,
}: MemberItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors',
        isCurrentUser && 'bg-muted/30'
      )}
    >
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.image || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(member.name, member.email)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            member.isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate flex items-center gap-1">
          {member.name || member.email}
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground">(вы)</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {formatLastSeen(member.lastSeenAt, member.isOnline)}
        </div>
      </div>
    </div>
  )
}
