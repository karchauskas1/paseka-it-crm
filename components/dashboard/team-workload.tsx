'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'

interface TeamMember {
  userId: string
  name: string
  tasksInProgress: number
}

interface TeamWorkloadProps {
  members: TeamMember[]
}

export function TeamWorkload({ members }: TeamWorkloadProps) {
  const maxTasks = Math.max(...members.map((m) => m.tasksInProgress), 1)

  return (
    <div className="bg-card rounded-lg shadow border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-600" />
          <h3 className="text-base font-semibold text-foreground">Загрузка команды</h3>
        </div>
        <Link
          href="/team"
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Команда
        </Link>
      </div>
      <div className="p-4 space-y-3">
        {members.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            Нет активных задач
          </div>
        ) : (
          members.map((member) => (
            <WorkloadBar
              key={member.userId}
              name={member.name}
              tasks={member.tasksInProgress}
              maxTasks={maxTasks}
            />
          ))
        )}
      </div>
    </div>
  )
}

function WorkloadBar({
  name,
  tasks,
  maxTasks,
}: {
  name: string
  tasks: number
  maxTasks: number
}) {
  const percentage = (tasks / maxTasks) * 100
  const workloadLevel = getWorkloadLevel(tasks)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground truncate">{name}</span>
        <span className={`text-xs ${workloadLevel.textColor}`}>
          {tasks} задач
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${workloadLevel.barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function getWorkloadLevel(tasks: number) {
  if (tasks >= 5) {
    return {
      barColor: 'bg-red-500',
      textColor: 'text-red-600',
    }
  }
  if (tasks >= 3) {
    return {
      barColor: 'bg-orange-500',
      textColor: 'text-orange-600',
    }
  }
  return {
    barColor: 'bg-green-500',
    textColor: 'text-green-600',
  }
}
