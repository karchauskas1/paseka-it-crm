'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import type { PainCategory, PainSeverity } from '@prisma/client'

interface PainFiltersProps {
  onFilterChange: (filters: {
    category?: PainCategory
    severity?: PainSeverity
    sortBy?: string
    search?: string
  }) => void
}

const categories: Array<{ value: PainCategory; label: string }> = [
  { value: 'TIME_MANAGEMENT', label: 'Управление временем' },
  { value: 'COST', label: 'Стоимость' },
  { value: 'TECHNICAL', label: 'Технические' },
  { value: 'PROCESS', label: 'Процессы' },
  { value: 'COMMUNICATION', label: 'Коммуникация' },
  { value: 'QUALITY', label: 'Качество' },
  { value: 'SCALABILITY', label: 'Масштабируемость' },
  { value: 'SECURITY', label: 'Безопасность' },
  { value: 'OTHER', label: 'Другое' },
]

const severities: Array<{ value: PainSeverity; label: string }> = [
  { value: 'LOW', label: 'Низкая' },
  { value: 'MEDIUM', label: 'Средняя' },
  { value: 'HIGH', label: 'Высокая' },
  { value: 'CRITICAL', label: 'Критическая' },
]

const sortOptions = [
  { value: 'createdAt', label: 'Недавние' },
  { value: 'frequency', label: 'Частота' },
  { value: 'trend', label: 'Тренд' },
]

export function PainFilters({ onFilterChange }: PainFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-2">
        <Label htmlFor="search" className="text-sm">
          Поиск
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="Искать боли..."
            className="pl-9"
            onChange={(e) =>
              onFilterChange({ search: e.target.value || undefined })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm">
          Категория
        </Label>
        <Select
          onValueChange={(value) =>
            onFilterChange({
              category: value === 'all' ? undefined : (value as PainCategory),
            })
          }
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="severity" className="text-sm">
          Серьезность
        </Label>
        <Select
          onValueChange={(value) =>
            onFilterChange({
              severity: value === 'all' ? undefined : (value as PainSeverity),
            })
          }
        >
          <SelectTrigger id="severity">
            <SelectValue placeholder="Все уровни" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все уровни</SelectItem>
            {severities.map((sev) => (
              <SelectItem key={sev.value} value={sev.value}>
                {sev.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortBy" className="text-sm">
          Сортировка
        </Label>
        <Select
          defaultValue="createdAt"
          onValueChange={(value) => onFilterChange({ sortBy: value })}
        >
          <SelectTrigger id="sortBy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
