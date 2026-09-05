import prisma from '../config/db.js';
import { createAuditLog } from '../middleware/audit.js';
import { computeBlendedRiskScore, getRequiredApprovalLevel } from './discount.service.js';
import { notifyRep } from '../websocket/chat.ws.js';

/**
 * Routes a quotation through the approval chain based on its blended risk score.
 * Creates ApprovalStep records for required approvers.
 */
export async function routeForApproval(quotationId, submitterId) {
  const blendedScore = await computeBlendedRiskScore(quotationId);
  const level = await getRequiredApprovalLevel(blendedScore);

  if (level === 'NONE') {
    // Auto-approve — no human approval needed
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'APPROVED' },
    });

    await createAuditLog({
      entityType: 'Quotation',
      entityId: quotationId,
      actorId: submitterId,
      action: 'AUTO_APPROVED',
      reason: `Blended risk score ${blendedScore} is within auto-approval thresholds`,
    });

    return { approved: true, level: 'NONE', blendedScore };
  }

  // Create approval steps
  const steps = [];

  // Manager approval is always required when level is MANAGER or FINANCE
  steps.push({
    quotationId,
    approverRole: 'SALES_MANAGER',
    status: 'PENDING',
  });

  if (level === 'FINANCE') {
    steps.push({
      quotationId,
      approverRole: 'FINANCE',
      status: 'PENDING',
    });
  }

  // Clear any existing pending steps (in case of re-submission)
  await prisma.approvalStep.deleteMany({
    where: { quotationId, status: 'PENDING' },
  });

  await prisma.approvalStep.createMany({ data: steps });

  // Update quotation status
  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: 'PENDING_MANAGER' },
  });

  await createAuditLog({
    entityType: 'Quotation',
    entityId: quotationId,
    actorId: submitterId,
    action: 'SUBMITTED_FOR_APPROVAL',
    reason: `Blended risk score ${blendedScore} requires ${level} approval`,
    metadata: { blendedScore, level, stepsCreated: steps.length },
  });

  return { approved: false, level, blendedScore, stepsCreated: steps.length };
}

/**
 * Processes an approval action (approve, reject, return) on a quotation.
 */
export async function processApproval(quotationId, approverId, approverRole, action, reason) {
  // Find the pending step for this approver role
  const step = await prisma.approvalStep.findFirst({
    where: {
      quotationId,
      approverRole,
      status: 'PENDING',
    },
  });

  if (!step) {
    throw new Error(`No pending approval step found for role ${approverRole}`);
  }

  // Update the step
  await prisma.approvalStep.update({
    where: { id: step.id },
    data: {
      approverId,
      status: action, // 'APPROVED', 'REJECTED', 'RETURNED'
      reason,
    },
  });

  await createAuditLog({
    entityType: 'Quotation',
    entityId: quotationId,
    actorId: approverId,
    action: `APPROVAL_${action}`,
    reason,
    metadata: { approverRole, stepId: step.id },
  });

  if (action === 'REJECTED') {
    // Set status to NEEDS_REVISION (not REJECTED) — rep can rework and resubmit
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'NEEDS_REVISION' },
    });

    // Notify the assigned rep via Socket.io
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { repId: true },
    });
    if (quotation?.repId) {
      notifyRep(quotation.repId, {
        type: 'QUOTATION_NEEDS_REVISION',
        quotationId,
        reason,
        message: `Quotation needs revision: ${reason}`,
      });
    }

    return { status: 'NEEDS_REVISION' };
  }

  if (action === 'RETURNED') {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'DRAFT' },
    });
    return { status: 'RETURNED' };
  }

  // APPROVED — check if there are remaining pending steps
  const remainingSteps = await prisma.approvalStep.findMany({
    where: { quotationId, status: 'PENDING' },
  });

  if (remainingSteps.length === 0) {
    // All steps approved — mark quotation as approved
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'APPROVED' },
    });
    return { status: 'APPROVED' };
  }

  // Still pending — move to next level (Finance)
  const nextStep = remainingSteps[0];
  const newStatus = nextStep.approverRole === 'FINANCE' ? 'PENDING_FINANCE' : 'PENDING_MANAGER';

  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: newStatus },
  });

  return { status: newStatus, nextApprover: nextStep.approverRole };
}

/**
 * Gets the approval trail for a quotation.
 */
export async function getApprovalTrail(quotationId) {
  return prisma.approvalStep.findMany({
    where: { quotationId },
    include: { approver: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
}
