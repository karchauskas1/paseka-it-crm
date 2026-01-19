export const feedbackTypeLabels: Record<string, string> = {
  BUG: 'Баг',
  FEATURE: 'Новая функция',
  IMPROVEMENT: 'Улучшение',
}

export const feedbackStatusLabels: Record<string, string> = {
  OPEN: 'Открыто',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решено',
  CLOSED: 'Закрыто',
}

export const feedbackTypeColors: Record<string, string> = {
  BUG: 'bg-red-100 text-red-800',
  FEATURE: 'bg-blue-100 text-blue-800',
  IMPROVEMENT: 'bg-green-100 text-green-800',
}

export const feedbackStatusColors: Record<string, string> = {
  OPEN: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-300 text-gray-800',
}
