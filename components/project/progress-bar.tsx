'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  completed: number
  total: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  completed,
  total,
  className,
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size]

  const colorClass =
    percentage === 100
      ? 'bg-green-500'
      : percentage >= 75
      ? 'bg-blue-500'
      : percentage >= 50
      ? 'bg-yellow-500'
      : 'bg-gray-400'

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            Прогресс
          </span>
          <span className="text-sm text-gray-500">
            {completed} / {total} задач ({percentage}%)
          </span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', heightClass)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
