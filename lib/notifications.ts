import { db } from './db'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message?: string
  entityType?: string
  entityId?: string
}

/**
 * Создание уведомления для пользователя
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, type, title, message, entityType, entityId } = params

  try {
    await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
      },
    })
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

/**
 * Создание уведомления о назначении задачи
 */
export async function notifyTaskAssigned(
  assigneeId: string,
  taskTitle: string,
  taskId: string,
  assignedByName: string
): Promise<void> {
  await createNotification({
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title: 'Новая задача назначена',
    message: `${assignedByName} назначил(а) вам задачу: "${taskTitle}"`,
    entityType: 'task',
    entityId: taskId,
  })
}

/**
 * Создание уведомления о приближающемся дедлайне задачи
 */
export async function notifyTaskDueSoon(
  userId: string,
  taskTitle: string,
  taskId: string,
  dueDate: Date
): Promise<void> {
  const formattedDate = dueDate.toLocaleDateString('ru-RU')
  await createNotification({
    userId,
    type: 'TASK_DUE_SOON',
    title: 'Приближается дедлайн',
    message: `Срок задачи "${taskTitle}" истекает ${formattedDate}`,
    entityType: 'task',
    entityId: taskId,
  })
}

/**
 * Создание уведомления о завершении задачи
 */
export async function notifyTaskCompleted(
  userId: string,
  taskTitle: string,
  taskId: string,
  completedByName: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'TASK_COMPLETED',
    title: 'Задача завершена',
    message: `${completedByName} завершил(а) задачу: "${taskTitle}"`,
    entityType: 'task',
    entityId: taskId,
  })
}

/**
 * Создание уведомления об изменении статуса проекта
 */
export async function notifyProjectStatusChanged(
  userId: string,
  projectName: string,
  projectId: string,
  oldStatus: string,
  newStatus: string,
  changedByName: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'PROJECT_STATUS_CHANGED',
    title: 'Статус проекта изменён',
    message: `${changedByName} изменил(а) статус проекта "${projectName}": ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}`,
    entityType: 'project',
    entityId: projectId,
  })
}

/**
 * Создание уведомления о новом комментарии
 */
export async function notifyCommentAdded(
  userId: string,
  entityType: 'project' | 'task',
  entityName: string,
  entityId: string,
  authorName: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'COMMENT_ADDED',
    title: 'Новый комментарий',
    message: `${authorName} оставил(а) комментарий к ${entityType === 'project' ? 'проекту' : 'задаче'} "${entityName}"`,
    entityType,
    entityId,
  })
}

/**
 * Создание уведомления об упоминании
 */
export async function notifyMention(
  userId: string,
  entityType: 'project' | 'task',
  entityName: string,
  entityId: string,
  mentionedByName: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'MENTION',
    title: 'Вас упомянули',
    message: `${mentionedByName} упомянул(а) вас в комментарии к ${entityType === 'project' ? 'проекту' : 'задаче'} "${entityName}"`,
    entityType,
    entityId,
  })
}

/**
 * Создание уведомления о приближающемся дедлайне проекта
 */
export async function notifyDeadlineApproaching(
  userId: string,
  projectName: string,
  projectId: string,
  deadline: Date
): Promise<void> {
  const formattedDate = deadline.toLocaleDateString('ru-RU')
  await createNotification({
    userId,
    type: 'DEADLINE_APPROACHING',
    title: 'Приближается дедлайн проекта',
    message: `Срок проекта "${projectName}" истекает ${formattedDate}`,
    entityType: 'project',
    entityId: projectId,
  })
}

/**
 * Получить непрочитанные уведомления пользователя
 */
export async function getUnreadNotifications(userId: string, limit: number = 20) {
  return db.notification.findMany({
    where: {
      userId,
      isRead: false,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Получить количество непрочитанных уведомлений
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: {
      userId,
      isRead: false,
    },
  })
}

/**
 * Получить все уведомления пользователя
 */
export async function getUserNotifications(
  userId: string,
  options?: { limit?: number; offset?: number }
) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 20,
    skip: options?.offset ?? 0,
  })
}

/**
 * Отметить уведомление как прочитанное
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await db.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Отметить все уведомления пользователя как прочитанные
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await db.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Удалить уведомление
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await db.notification.delete({
    where: { id: notificationId },
  })
}

/**
 * Удалить старые уведомления (старше 30 дней)
 */
export async function cleanupOldNotifications(): Promise<number> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const result = await db.notification.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
      isRead: true,
    },
  })

  return result.count
}

/**
 * Уведомить всех участников проекта (кроме инициатора)
 */
export async function notifyProjectTeam(
  projectId: string,
  excludeUserId: string,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> {
  // Получаем проект с workspace
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: {
          members: {
            select: { userId: true },
          },
        },
      },
    },
  })

  if (!project) return

  // Создаём уведомления для всех участников workspace
  const userIds = project.workspace.members
    .map(m => m.userId)
    .filter(id => id !== excludeUserId)

  await Promise.all(
    userIds.map(userId =>
      createNotification({
        userId,
        type,
        title,
        message,
        entityType: 'project',
        entityId: projectId,
      })
    )
  )
}

/**
 * Форматирование статуса для отображения
 */
function formatStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    LEAD: 'Лид',
    QUALIFICATION: 'Квалификация',
    BRIEFING: 'Брифинг',
    IN_PROGRESS: 'В работе',
    ON_HOLD: 'На паузе',
    COMPLETED: 'Завершён',
    REJECTED: 'Отклонён',
    ARCHIVED: 'Архив',
    TODO: 'К выполнению',
    IN_REVIEW: 'На проверке',
    BLOCKED: 'Заблокирована',
    CANCELLED: 'Отменена',
  }
  return statusLabels[status] || status
}

/**
 * Форматирование типа уведомления для отображения
 */
export function formatNotificationType(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    TASK_ASSIGNED: 'Назначение задачи',
    TASK_DUE_SOON: 'Приближается дедлайн',
    TASK_COMPLETED: 'Задача завершена',
    PROJECT_STATUS_CHANGED: 'Изменение статуса',
    COMMENT_ADDED: 'Новый комментарий',
    MENTION: 'Упоминание',
    DEADLINE_APPROACHING: 'Приближается дедлайн',
  }
  return labels[type] || type
}

/**
 * Получить иконку для типа уведомления
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    TASK_ASSIGNED: 'user-plus',
    TASK_DUE_SOON: 'clock',
    TASK_COMPLETED: 'check-circle',
    PROJECT_STATUS_CHANGED: 'refresh-cw',
    COMMENT_ADDED: 'message-circle',
    MENTION: 'at-sign',
    DEADLINE_APPROACHING: 'alert-triangle',
  }
  return icons[type] || 'bell'
}
