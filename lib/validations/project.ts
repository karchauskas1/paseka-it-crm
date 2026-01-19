import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(3, 'Минимум 3 символа'),
  clientId: z.string().min(1, 'Выберите клиента'),
  type: z.enum(['MONEY', 'GROWTH', 'INVESTMENT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  description: z.string().optional(),
  pain: z.string().optional(),
  whyProblem: z.string().optional(),
  consequences: z.string().optional(),
  goals: z.string().optional(),
  expectedResult: z.string().optional(),
  successCriteria: z.string().optional(),
  budget: z.number().optional(),
  startDate: z.string().optional(),
  endDatePlan: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>

export const projectTypeLabels: Record<string, string> = {
  MONEY: 'Деньги',
  GROWTH: 'Рост',
  INVESTMENT: 'Инвестиция',
}

export const projectStatusLabels: Record<string, string> = {
  LEAD: 'Лид',
  QUALIFICATION: 'Квалификация',
  BRIEFING: 'Брифинг',
  IN_PROGRESS: 'В работе',
  ON_HOLD: 'На паузе',
  COMPLETED: 'Завершён',
  REJECTED: 'Отклонён',
  ARCHIVED: 'Архив',
}

export const priorityLabels: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
}
