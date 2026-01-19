'use client'

interface SentimentGaugeProps {
  sentiment: number // -1.0 to 1.0
  size?: 'sm' | 'md' | 'lg'
}

export function SentimentGauge({ sentiment, size = 'md' }: SentimentGaugeProps) {
  // Normalize sentiment to 0-100 range for visualization
  const normalized = ((sentiment + 1) / 2) * 100

  // Determine color based on sentiment
  const getColor = () => {
    if (sentiment > 0.2) return 'bg-green-500'
    if (sentiment < -0.2) return 'bg-red-500'
    return 'bg-yellow-500'
  }

  // Determine text color
  const getTextColor = () => {
    if (sentiment > 0.2) return 'text-green-700'
    if (sentiment < -0.2) return 'text-red-700'
    return 'text-yellow-700'
  }

  // Determine label
  const getLabel = () => {
    if (sentiment > 0.5) return 'Очень позитивный'
    if (sentiment > 0.2) return 'Позитивный'
    if (sentiment > -0.2) return 'Нейтральный'
    if (sentiment > -0.5) return 'Негативный'
    return 'Очень негативный'
  }

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`font-medium ${getTextColor()} ${textSizeClasses[size]}`}>
          {getLabel()}
        </span>
        <span className={`${textSizeClasses[size]} text-muted-foreground`}>
          {sentiment > 0 ? '+' : ''}{sentiment.toFixed(2)}
        </span>
      </div>
      <div className={`w-full bg-secondary rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${getColor()} ${sizeClasses[size]} transition-all duration-300`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  )
}
