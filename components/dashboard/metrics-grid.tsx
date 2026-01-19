'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricsGridProps {
  metrics: {
    currentPeriodProjects: number
    prevPeriodProjects: number
    projectsChange: number
    currentRevenue: number
    previousRevenue: number
    revenueChange: number
    activeBudget: number
    activeProjectsCount: number
    winRate: number
    avgCycleDays: number
    overdueTasks: number
  }
  period: string
}

export function MetricsGrid({ metrics, period }: MetricsGridProps) {
  const periodLabel = {
    week: 'неделю',
    month: 'месяц',
    quarter: 'квартал',
    year: 'год',
  }[period] || 'месяц'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Новые проекты"
        value={metrics.currentPeriodProjects}
        subtitle={`за ${periodLabel}`}
        change={metrics.projectsChange}
        color="blue"
      />
      <MetricCard
        title="Выручка"
        value={formatCurrency(metrics.currentRevenue)}
        subtitle={`за ${periodLabel}`}
        change={metrics.revenueChange}
        color="green"
      />
      <MetricCard
        title="Активный бюджет"
        value={formatCurrency(metrics.activeBudget)}
        subtitle={`${metrics.activeProjectsCount} активных проектов`}
        color="purple"
      />
      <MetricCard
        title="Win Rate"
        value={`${metrics.winRate}%`}
        subtitle="Завершённые / (Завершённые + Отклонённые)"
        color="indigo"
      />
      <MetricCard
        title="Средний цикл"
        value={metrics.avgCycleDays ? `${metrics.avgCycleDays} дн.` : 'N/A'}
        subtitle="От старта до завершения"
        color="cyan"
      />
      <MetricCard
        title="Просроченные задачи"
        value={metrics.overdueTasks}
        subtitle="Требуют внимания"
        color={metrics.overdueTasks > 0 ? 'red' : 'green'}
        alert={metrics.overdueTasks > 0}
      />
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle: string
  change?: number
  color: 'blue' | 'green' | 'purple' | 'indigo' | 'cyan' | 'red' | 'orange'
  alert?: boolean
}

function MetricCard({ title, value, subtitle, change, color, alert }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    cyan: 'bg-cyan-50 border-cyan-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
  }

  const textColorClasses = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    indigo: 'text-indigo-700',
    cyan: 'text-cyan-700',
    red: 'text-red-700',
    orange: 'text-orange-700',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]} ${alert ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-medium ${textColorClasses[color]} opacity-80`}>{title}</h3>
        {change !== undefined && <ChangeIndicator change={change} />}
      </div>
      <p className={`mt-2 text-2xl font-bold ${textColorClasses[color]}`}>{value}</p>
      <p className={`mt-1 text-xs ${textColorClasses[color]} opacity-70`}>{subtitle}</p>
    </div>
  )
}

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="flex items-center text-gray-500 text-xs">
        <Minus className="h-3 w-3 mr-1" />
        0%
      </span>
    )
  }

  if (change > 0) {
    return (
      <span className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{change}%
      </span>
    )
  }

  return (
    <span className="flex items-center text-red-600 text-xs">
      <TrendingDown className="h-3 w-3 mr-1" />
      {change}%
    </span>
  )
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} млн ₽`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)} тыс ₽`
  }
  return `${amount.toLocaleString('ru-RU')} ₽`
}
