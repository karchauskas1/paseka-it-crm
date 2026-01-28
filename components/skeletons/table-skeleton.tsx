'use client'

import { cn } from '@/lib/utils'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export function TableSkeleton({ rows = 5, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('bg-card rounded-lg shadow border overflow-hidden', className)}>
      {/* Header */}
      <div className="border-b bg-muted px-6 py-3 animate-pulse">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-0 px-6 py-4 animate-pulse">
          <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  'h-4 bg-gray-200 rounded',
                  colIndex === 0 ? 'w-4/5' : 'w-3/4'
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="border-b px-6 py-4 animate-pulse">
      <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-gray-200 rounded',
              i === 0 ? 'w-4/5' : 'w-3/4'
            )}
          />
        ))}
      </div>
    </div>
  )
}

export function DataTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 animate-pulse">
        <div className="h-10 w-64 bg-gray-200 rounded-md" />
        <div className="h-10 w-32 bg-gray-200 rounded-md" />
        <div className="h-10 w-32 bg-gray-200 rounded-md" />
        <div className="ml-auto h-10 w-32 bg-gray-200 rounded-md" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} columns={6} />

      {/* Pagination */}
      <div className="flex items-center justify-between animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}
