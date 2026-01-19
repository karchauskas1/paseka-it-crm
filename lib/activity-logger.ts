import { db } from './db'
import { ActivityType } from '@prisma/client'

export type EntityType = 'project' | 'task' | 'client' | 'comment' | 'milestone' | 'document' | 'architecture'

interface LogActivityParams {
  type: ActivityType
  entityType: EntityType
  entityId: string
  action: string
  oldValue?: unknown
  newValue?: unknown
  userId: string
  projectId?: string
  workspaceId?: string
}

/**
 * Централизованное логирование активности в системе
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { type, entityType, entityId, action, oldValue, newValue, userId, projectId, workspaceId } = params

  try {
    await db.activity.create({
      data: {
        type,
        entityType,
        entityId,
        action,
        oldValue: oldValue !== undefined ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue !== undefined ? JSON.parse(JSON.stringify(newValue)) : null,
        userId,
        projectId,
        workspaceId,
      },
    })
  } catch (error) {
    // Не блокируем основную операцию при ошибке логирования
    console.error('Error logging activity:', error)
  }
}

/**
 * Логирование создания сущности
 */
export async function logCreate(
  entityType: EntityType,
  entityId: string,
  entityData: unknown,
  userId: string,
  options?: { projectId?: string; workspaceId?: string }
): Promise<void> {
  await logActivity({
    type: 'CREATE',
    entityType,
    entityId,
    action: `Created ${entityType}`,
    newValue: entityData,
    userId,
    projectId: options?.projectId,
    workspaceId: options?.workspaceId,
  })
}

/**
 * Логирование обновления сущности
 */
export async function logUpdate(
  entityType: EntityType,
  entityId: string,
  oldData: unknown,
  newData: unknown,
  userId: string,
  options?: { projectId?: string; workspaceId?: string }
): Promise<void> {
  await logActivity({
    type: 'UPDATE',
    entityType,
    entityId,
    action: `Updated ${entityType}`,
    oldValue: oldData,
    newValue: newData,
    userId,
    projectId: options?.projectId,
    workspaceId: options?.workspaceId,
  })
}

/**
 * Логирование удаления сущности
 */
export async function logDelete(
  entityType: EntityType,
  entityId: string,
  entityData: unknown,
  userId: string,
  options?: { projectId?: string; workspaceId?: string }
): Promise<void> {
  await logActivity({
    type: 'DELETE',
    entityType,
    entityId,
    action: `Deleted ${entityType}`,
    oldValue: entityData,
    userId,
    projectId: options?.projectId,
    workspaceId: options?.workspaceId,
  })
}

/**
 * Логирование изменения статуса
 */
export async function logStatusChange(
  entityType: EntityType,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  options?: { projectId?: string; workspaceId?: string }
): Promise<void> {
  await logActivity({
    type: 'STATUS_CHANGE',
    entityType,
    entityId,
    action: `Changed status from ${oldStatus} to ${newStatus}`,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    userId,
    projectId: options?.projectId,
    workspaceId: options?.workspaceId,
  })
}

/**
 * Логирование назначения исполнителя
 */
export async function logAssignment(
  entityType: EntityType,
  entityId: string,
  oldAssigneeId: string | null,
  newAssigneeId: string | null,
  userId: string,
  options?: { projectId?: string; workspaceId?: string }
): Promise<void> {
  await logActivity({
    type: 'ASSIGNMENT',
    entityType,
    entityId,
    action: newAssigneeId ? 'Assigned to user' : 'Unassigned',
    oldValue: { assigneeId: oldAssigneeId },
    newValue: { assigneeId: newAssigneeId },
    userId,
    projectId: options?.projectId,
    workspaceId: options?.workspaceId,
  })
}

/**
 * Логирование комментария
 */
export async function logComment(
  entityType: EntityType,
  entityId: string,
  commentContent: string,
  userId: string,
  options?: { projectId?: string; workspaceId?: string }
): Promise<void> {
  await logActivity({
    type: 'COMMENT',
    entityType,
    entityId,
    action: 'Added comment',
    newValue: { content: commentContent.substring(0, 200) }, // Ограничиваем длину
    userId,
    projectId: options?.projectId,
    workspaceId: options?.workspaceId,
  })
}

/**
 * Получить историю активности для сущности
 */
export async function getEntityActivity(
  entityType: EntityType,
  entityId: string,
  limit: number = 50
) {
  return db.activity.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Получить историю активности для проекта
 */
export async function getProjectActivity(projectId: string, limit: number = 50) {
  return db.activity.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Получить активность в workspace
 */
export async function getWorkspaceActivity(
  workspaceId: string,
  options?: {
    type?: ActivityType
    entityType?: EntityType
    userId?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
  }
) {
  const where: {
    workspaceId?: string
    type?: ActivityType
    entityType?: string
    userId?: string
    createdAt?: { gte?: Date; lte?: Date }
  } = {}

  // Получаем проекты workspace для фильтрации
  const projects = await db.project.findMany({
    where: { workspaceId },
    select: { id: true },
  })
  const projectIds = projects.map(p => p.id)

  if (options?.type) {
    where.type = options.type
  }

  if (options?.entityType) {
    where.entityType = options.entityType
  }

  if (options?.userId) {
    where.userId = options.userId
  }

  if (options?.from || options?.to) {
    where.createdAt = {}
    if (options?.from) {
      where.createdAt.gte = options.from
    }
    if (options?.to) {
      where.createdAt.lte = options.to
    }
  }

  return db.activity.findMany({
    where: {
      ...where,
      OR: [
        { workspaceId },
        { projectId: { in: projectIds } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

/**
 * Форматирование типа активности для отображения
 */
export function formatActivityType(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    CREATE: 'Создание',
    UPDATE: 'Обновление',
    DELETE: 'Удаление',
    COMMENT: 'Комментарий',
    STATUS_CHANGE: 'Изменение статуса',
    ASSIGNMENT: 'Назначение',
  }
  return labels[type] || type
}

/**
 * Форматирование типа сущности для отображения
 */
export function formatEntityType(entityType: string): string {
  const labels: Record<string, string> = {
    project: 'Проект',
    task: 'Задача',
    client: 'Клиент',
    comment: 'Комментарий',
    milestone: 'Этап',
    document: 'Документ',
    architecture: 'Архитектура',
  }
  return labels[entityType] || entityType
}
