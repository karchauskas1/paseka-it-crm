import { z } from 'zod'

export const clientSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  company: z.string().optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.enum(['WARM', 'COLD', 'REFERRAL', 'OFFLINE', 'WEBSITE', 'SOCIAL']).optional(),
  notes: z.string().optional(),
})

export type ClientFormData = z.infer<typeof clientSchema>

export const sourceLabels: Record<string, string> = {
  WARM: 'Тёплый контакт',
  COLD: 'Холодный контакт',
  REFERRAL: 'Рекомендация',
  OFFLINE: 'Оффлайн',
  WEBSITE: 'Сайт',
  SOCIAL: 'Соцсети',
}

export const statusLabels: Record<string, string> = {
  ACTIVE: 'Активный',
  INACTIVE: 'Неактивный',
  ARCHIVED: 'В архиве',
}
