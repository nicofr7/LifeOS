import { prisma } from './prisma'

// ===== Audit Log =====

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
      },
    })
  } catch {
    // Don't let audit log failures break the main operation
  }
}

// ===== Notification Helper =====

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'info',
  actionUrl?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        actionUrl: actionUrl || null,
      },
    })
  } catch {
    // Don't let notification failures break the main operation
  }
}
