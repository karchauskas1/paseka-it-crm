'use client'

import { Button } from '@/components/ui/button'

interface PeriodSelectorProps {
  value: string
  onChange: (period: string) => void
}

const periods = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={value === period.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(period.value)}
          className={`text-xs px-3 py-1 h-7 ${
            value === period.value
              ? ''
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}
