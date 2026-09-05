import prisma from '../config/db.js';

/**
 * Creates an audit log entry.
 * Called explicitly in services — not as Express middleware, to ensure 
 * we capture the right context (actor, reason, action) per operation.
 */
export async function createAuditLog({ entityType, entityId, actorId, action, reason = null, metadata = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        actorId,
        action,
        reason,
        metadata,
      },
    });
  } catch (err) {
    // Audit log failures should never break the main operation
    console.error('⚠️ Audit log write failed:', err.message);
  }
}
