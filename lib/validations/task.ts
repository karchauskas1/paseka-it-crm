import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(3, 'Минимум 3 символа'),
  description: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  complexity: z.enum(['S', 'M', 'L', 'XL']).optional(),
  estimatedHours: z.number().optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>

export const taskStatusLabels: Record<string, string> = {
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  IN_REVIEW: 'На проверке',
  BLOCKED: 'Заблокирована',
  COMPLETED: 'Выполнена',
  CANCELLED: 'Отменена',
}

export const taskStatusColors: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-purple-100 text-purple-800',
  BLOCKED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export const priorityLabels: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
}

export const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

export const complexityLabels: Record<string, string> = {
  S: 'S (маленькая)',
  M: 'M (средняя)',
  L: 'L (большая)',
  XL: 'XL (очень большая)',
}
