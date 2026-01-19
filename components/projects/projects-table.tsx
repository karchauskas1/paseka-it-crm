'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Project {
  id: string
  name: string
  status: string
  type: string
  budget: number | null
  revenue: number | null
  startDate: string | null
  endDatePlan: string | null
  client: { name: string } | null
  _count: { tasks: number }
}

interface ProjectsTableProps {
  projects: Project[]
}

type SortField = 'name' | 'client' | 'status' | 'type' | 'budget' | 'revenue' | 'endDatePlan'
type SortOrder = 'asc' | 'desc'

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    let aValue: any = ''
    let bValue: any = ''

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'client':
        aValue = a.client?.name?.toLowerCase() || ''
        bValue = b.client?.name?.toLowerCase() || ''
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'type':
        aValue = a.type
        bValue = b.type
        break
      case 'budget':
        aValue = a.budget || 0
        bValue = b.budget || 0
        break
      case 'revenue':
        aValue = a.revenue || 0
        bValue = b.revenue || 0
        break
      case 'endDatePlan':
        aValue = a.endDatePlan ? new Date(a.endDatePlan).getTime() : 0
        bValue = b.endDatePlan ? new Date(b.endDatePlan).getTime() : 0
        break
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortableHeader
                field="name"
                label="Название"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="client"
                label="Клиент"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="status"
                label="Статус"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="type"
                label="Тип"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="budget"
                label="Бюджет"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="revenue"
                label="Выручка"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="endDatePlan"
                label="Дедлайн"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Задачи
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project.client?.name || '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getTypeVariant(project.type)}>
                    {getTypeLabel(project.type)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project.budget ? `${project.budget.toLocaleString('ru-RU')} ₽` : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project.revenue ? `${project.revenue.toLocaleString('ru-RU')} ₽` : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project.endDatePlan
                    ? format(new Date(project.endDatePlan), 'd MMM yyyy', { locale: ru })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project._count.tasks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedProjects.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          Проекты не найдены
        </div>
      )}
    </div>
  )
}

function SortableHeader({
  field,
  label,
  currentField,
  currentOrder,
  onSort,
}: {
  field: SortField
  label: string
  currentField: SortField
  currentOrder: SortOrder
  onSort: (field: SortField) => void
}) {
  const isActive = currentField === field

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 -mb-1 ${
              isActive && currentOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'
            }`}
          />
          <ChevronDown
            className={`h-3 w-3 ${
              isActive && currentOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'
            }`}
          />
        </span>
      </div>
    </th>
  )
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' {
  const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'> = {
    LEAD: 'secondary',
    QUALIFICATION: 'warning',
    BRIEFING: 'info',
    IN_PROGRESS: 'info',
    ON_HOLD: 'warning',
    COMPLETED: 'success',
    REJECTED: 'destructive',
    ARCHIVED: 'secondary',
  }
  return variants[status] || 'secondary'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    LEAD: 'Лид',
    QUALIFICATION: 'Квалификация',
    BRIEFING: 'Брифинг',
    IN_PROGRESS: 'В работе',
    ON_HOLD: 'На паузе',
    COMPLETED: 'Завершён',
    REJECTED: 'Отклонён',
    ARCHIVED: 'Архив',
  }
  return labels[status] || status
}

function getTypeVariant(type: string): 'default' | 'secondary' | 'success' | 'warning' | 'info' {
  const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'info'> = {
    MONEY: 'success',
    GROWTH: 'info',
    INVESTMENT: 'warning',
  }
  return variants[type] || 'secondary'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MONEY: 'Деньги',
    GROWTH: 'Рост',
    INVESTMENT: 'Инвестиции',
  }
  return labels[type] || type
}
