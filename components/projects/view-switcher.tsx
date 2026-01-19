'use client'

import { LayoutGrid, Kanban, GanttChart, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ViewMode = 'cards' | 'table' | 'kanban' | 'timeline'

interface ViewSwitcherProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

const views: { value: ViewMode; icon: React.ReactNode; label: string }[] = [
  { value: 'cards', icon: <LayoutGrid className="h-4 w-4" />, label: 'Карточки' },
  { value: 'table', icon: <List className="h-4 w-4" />, label: 'Таблица' },
  { value: 'kanban', icon: <Kanban className="h-4 w-4" />, label: 'Kanban' },
  { value: 'timeline', icon: <GanttChart className="h-4 w-4" />, label: 'Timeline' },
]

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {views.map((view) => (
        <Button
          key={view.value}
          variant={value === view.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(view.value)}
          className={`h-8 px-3 ${
            value === view.value
              ? ''
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
          title={view.label}
        >
          {view.icon}
          <span className="ml-2 hidden sm:inline">{view.label}</span>
        </Button>
      ))}
    </div>
  )
}
