'use client'

import { TrendingUp, TrendingDown, DollarSign, Wallet, PiggyBank } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinanceBlockProps {
  budget: number | null
  revenue: number | null
  className?: string
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

export function FinanceBlock({ budget, revenue, className }: FinanceBlockProps) {
  const profit = (revenue || 0) - (budget || 0)
  const margin = budget && budget > 0 && revenue ? ((revenue - budget) / budget) * 100 : 0
  const isProfit = profit >= 0

  return (
    <div className={cn('bg-white rounded-lg border p-4', className)}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-gray-500" />
        Финансы
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {/* Бюджет */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Wallet className="h-3.5 w-3.5" />
            <span>Бюджет</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(budget)}
          </div>
        </div>

        {/* Выручка */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <PiggyBank className="h-3.5 w-3.5" />
            <span>Выручка</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(revenue)}
          </div>
        </div>

        {/* Прибыль / Убыток */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {isProfit ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{isProfit ? 'Прибыль' : 'Убыток'}</span>
          </div>
          <div
            className={cn(
              'text-lg font-semibold',
              isProfit ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isProfit ? '+' : ''}
            {formatCurrency(profit)}
          </div>
        </div>
      </div>

      {/* Маржинальность */}
      {budget && budget > 0 && revenue !== null && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Маржинальность</span>
            <span
              className={cn(
                'text-sm font-medium',
                margin >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {margin >= 0 ? '+' : ''}
              {margin.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                margin >= 0 ? 'bg-green-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(Math.abs(margin), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
