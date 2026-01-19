import { db } from './db'
import { getCurrentUser } from './auth'
import { WorkspaceRole } from '@prisma/client'

// Определение действий в системе
export type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage_users'
  | 'manage_workspace'

// Матрица прав доступа по ролям
const ROLE_PERMISSIONS: Record<WorkspaceRole, Action[]> = {
  VIEWER: ['read'],
  MEMBER: ['read', 'create', 'update'],
  ADMIN: ['read', 'create', 'update', 'delete', 'manage_users'],
  OWNER: ['read', 'create', 'update', 'delete', 'manage_users', 'manage_workspace'],
}

/**
 * Проверяет, может ли роль выполнить указанное действие
 */
export function canPerformAction(role: WorkspaceRole, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions?.includes(action) ?? false
}

/**
 * Проверяет, имеет ли роль доступ выше указанного минимума
 */
export function hasMinimumRole(
  userRole: WorkspaceRole,
  minimumRole: WorkspaceRole
): boolean {
  const roleOrder: WorkspaceRole[] = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']
  const userRoleIndex = roleOrder.indexOf(userRole)
  const minimumRoleIndex = roleOrder.indexOf(minimumRole)
  return userRoleIndex >= minimumRoleIndex
}

/**
 * Получает роль пользователя в workspace
 */
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { role: true },
  })
  return member?.role ?? null
}

/**
 * Проверяет право доступа пользователя в workspace
 */
export async function checkPermission(
  userId: string,
  workspaceId: string,
  action: Action
): Promise<boolean> {
  const role = await getWorkspaceRole(userId, workspaceId)
  if (!role) return false
  return canPerformAction(role, action)
}

/**
 * Middleware-like функция для проверки прав в API routes
 * Выбрасывает ошибку если нет доступа
 */
export async function requirePermission(
  workspaceId: string,
  action: Action
): Promise<{ user: { id: string; email: string; name: string }; workspaceRole: WorkspaceRole }> {
  const user = await getCurrentUser()

  if (!user) {
    throw new PermissionError('Unauthorized', 401)
  }

  const role = await getWorkspaceRole(user.id, workspaceId)

  if (!role) {
    throw new PermissionError('Not a member of this workspace', 403)
  }

  if (!canPerformAction(role, action)) {
    throw new PermissionError(`Insufficient permissions for action: ${action}`, 403)
  }

  return { user, workspaceRole: role }
}

/**
 * Проверка только авторизации (без проверки workspace)
 */
export async function requireAuth(): Promise<{ id: string; email: string; name: string }> {
  const user = await getCurrentUser()

  if (!user) {
    throw new PermissionError('Unauthorized', 401)
  }

  return user
}

/**
 * Проверка роли ADMIN или OWNER
 */
export async function requireAdmin(workspaceId: string): Promise<void> {
  const user = await getCurrentUser()

  if (!user) {
    throw new PermissionError('Unauthorized', 401)
  }

  const role = await getWorkspaceRole(user.id, workspaceId)

  if (!role || !hasMinimumRole(role, 'ADMIN')) {
    throw new PermissionError('Admin access required', 403)
  }
}

/**
 * Проверка роли OWNER
 */
export async function requireOwner(workspaceId: string): Promise<void> {
  const user = await getCurrentUser()

  if (!user) {
    throw new PermissionError('Unauthorized', 401)
  }

  const role = await getWorkspaceRole(user.id, workspaceId)

  if (role !== 'OWNER') {
    throw new PermissionError('Owner access required', 403)
  }
}

/**
 * Класс ошибки прав доступа
 */
export class PermissionError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number = 403) {
    super(message)
    this.name = 'PermissionError'
    this.statusCode = statusCode
  }
}

/**
 * Обработчик ошибок прав доступа для API routes
 */
export function handlePermissionError(error: unknown): { error: string; status: number } {
  if (error instanceof PermissionError) {
    return { error: error.message, status: error.statusCode }
  }
  console.error('Unexpected error:', error)
  return { error: 'Internal server error', status: 500 }
}

/**
 * Получить все разрешения для роли
 */
export function getPermissionsForRole(role: WorkspaceRole): Action[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Проверка доступа к сущности (проект, задача и т.д.)
 * Проверяет что сущность принадлежит workspace пользователя
 */
export async function checkEntityAccess(
  userId: string,
  entityType: 'project' | 'task' | 'client',
  entityId: string
): Promise<{ hasAccess: boolean; workspaceId: string | null; role: WorkspaceRole | null }> {
  // Получаем workspace пользователя
  const member = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true, role: true },
  })

  if (!member) {
    return { hasAccess: false, workspaceId: null, role: null }
  }

  // Проверяем что сущность принадлежит workspace
  let entity: { workspaceId: string } | null = null

  switch (entityType) {
    case 'project':
      entity = await db.project.findUnique({
        where: { id: entityId },
        select: { workspaceId: true },
      })
      break
    case 'task':
      entity = await db.task.findUnique({
        where: { id: entityId },
        select: { workspaceId: true },
      })
      break
    case 'client':
      entity = await db.client.findUnique({
        where: { id: entityId },
        select: { workspaceId: true },
      })
      break
  }

  if (!entity || entity.workspaceId !== member.workspaceId) {
    return { hasAccess: false, workspaceId: member.workspaceId, role: member.role }
  }

  return { hasAccess: true, workspaceId: member.workspaceId, role: member.role }
}
