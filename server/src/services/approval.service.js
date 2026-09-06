import prisma from '../config/db.js';
import { createAuditLog } from '../middleware/audit.js';
import { computeBlendedRiskScore, getRequiredApprovalLevel } from './discount.service.js';
import { notifyRep, broadcastQuotationApproved } from '../websocket/chat.ws.js';
import { broadcastToDashboard } from '../websocket/dashboard.ws.js';

/**
 * Routes a quotation through the approval chain based on its blended risk score.
 * Creates ApprovalStep records for required approvers.
 */
export async function routeForApproval(quotationId, submitterId) {
  const blendedScore = await computeBlendedRiskScore(quotationId);

  // Calculate current quotation gross margin % and check if any discount is requested
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { lines: true },
  });
  const totalMarginPct = (quote && Number(quote.orderTotal) > 0)
    ? (Number(quote.totalMargin) / Number(quote.orderTotal)) * 100
    : null;
  const hasDiscounts = quote?.lines ? quote.lines.some(l => Number(l.discountPct) > 0) : true;

  const { level, marginBreach, minMarginFloor, marginPct } = await getRequiredApprovalLevel(blendedScore, totalMarginPct, hasDiscounts);

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

    return { approved: true, level: 'NONE', blendedScore, marginBreach: false };
  }

  // Create approval steps: Sales Manager is always first, followed by Finance if high risk/margin floor breached
  const steps = [
    {
      quotationId,
      approverRole: 'SALES_MANAGER',
      status: 'PENDING',
    },
  ];

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

  const reason = marginBreach
    ? `Gross margin ${marginPct.toFixed(1)}% is below company minimum floor (${minMarginFloor}%). Multi-tier escalation (Sales Manager + Finance) required.`
    : `Blended risk score ${blendedScore} requires ${level === 'FINANCE' ? 'Sales Manager + Finance' : 'Sales Manager'} approval`;

  await createAuditLog({
    entityType: 'Quotation',
    entityId: quotationId,
    actorId: submitterId,
    action: marginBreach ? 'MARGIN_FLOOR_BREACH_ESCALATION' : 'SUBMITTED_FOR_APPROVAL',
    reason,
    metadata: { blendedScore, level, marginBreach, totalMarginPct: marginPct, stepsCreated: steps.length },
  });

  return { approved: false, level, blendedScore, marginBreach, stepsCreated: steps.length };
}

/**
 * Processes an approval action (approve, reject, return) on a quotation.
 */
export async function processApproval(quotationId, approverId, approverRole, action, reason) {
  // Find the pending step for this approver role (or any pending step if ADMIN)
  const stepWhere = {
    quotationId,
    status: 'PENDING',
  };
  if (approverRole !== 'ADMIN') {
    stepWhere.approverRole = approverRole;
  }

  const step = await prisma.approvalStep.findFirst({
    where: stepWhere,
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
    // Set status to NEEDS_REVISION — rep can rework and resubmit
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

  // Check if there are remaining pending steps in the multi-tier chain
  if (action === 'APPROVED') {
    const remainingSteps = await prisma.approvalStep.findMany({
      where: { quotationId, status: 'PENDING' },
    });

    if (remainingSteps.length > 0 && approverRole !== 'ADMIN') {
      // Multi-tier chain: Manager approved, now escalate to Finance
      const nextRole = remainingSteps[0].approverRole;
      const nextStatus = nextRole === 'FINANCE' ? 'PENDING_FINANCE' : 'PENDING_MANAGER';

      await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: nextStatus },
      });

      await createAuditLog({
        entityType: 'Quotation',
        entityId: quotationId,
        actorId: approverId,
        action: 'APPROVAL_STEP_APPROVED',
        reason: `Sales Manager approved ("${reason || 'Approved'}"). Escaping to ${nextRole} for second-tier high risk clearance.`,
        metadata: { approverRole, nextApprover: nextRole },
      });

      return { status: nextStatus, nextApprover: nextRole };
    }

    // Final approval (all steps completed or ADMIN override)
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'APPROVED' },
    });

    await createAuditLog({
      entityType: 'Quotation',
      entityId: quotationId,
      actorId: approverId,
      action: 'APPROVAL_FULLY_APPROVED',
      reason: `${approverRole === 'FINANCE' ? 'Finance' : approverRole === 'SALES_MANAGER' ? 'Sales Manager' : 'Admin'} approved ("${reason || 'Approved'}"). Quotation is fully approved and ready for invoicing/fulfillment.`,
      metadata: { approverRole },
    });

    // Dispatch notifications to everyone (Admin, Manager, Rep, Buyer, Finance)
    await triggerApprovalNotifications(quotationId, approverRole, approverId, reason);

    return { status: 'APPROVED' };
  }
}

/**
 * Dispatches notifications and broadcasts to all stakeholders (Admin, Manager, Rep, Finance, Buyer)
 */
async function triggerApprovalNotifications(quotationId, approverRole, approverId, reason) {
  try {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        rep: true,
      },
    });
    if (!quote) return;

    const quoteNumber = quote.quoteNumber || `QT-${quote.id.slice(-6).toUpperCase()}`;
    const orderTotal = Number(quote.orderTotal || 0);
    const customerName = quote.customer?.name || 'Valued Customer';
    const approverLabel = approverRole === 'FINANCE' ? 'Finance' : 'Admin';

    // 1. Create persistent notifications in DB for all 5 stakeholder roles:
    // Admin, Sales Manager, Sales Rep, Finance, and Customer (Buyer)
    const notifications = [
      {
        targetRole: 'ADMIN',
        title: 'Quotation Fully Cleared',
        message: `Quotation ${quoteNumber} (${customerName}) for ₹${orderTotal.toLocaleString('en-IN')} has been approved by ${approverLabel}.`,
        entityId: quotationId,
        type: 'APPROVAL',
      },
      {
        targetRole: 'SALES_MANAGER',
        title: 'Deal Authorization Complete',
        message: `Quotation ${quoteNumber} (${customerName}) cleared by ${approverLabel} and ready for customer closing.`,
        entityId: quotationId,
        type: 'APPROVAL',
      },
      {
        targetRole: 'SALES_REP',
        userId: quote.repId,
        title: '🎉 Quotation Approved by Finance!',
        message: `Great news! Quotation ${quoteNumber} for ₹${orderTotal.toLocaleString('en-IN')} was approved by ${approverLabel} and can now be finalized with ${customerName}.`,
        entityId: quotationId,
        type: 'APPROVAL',
      },
      {
        targetRole: 'FINANCE',
        title: 'Financial Authorization Confirmed',
        message: `Quotation ${quoteNumber} (${customerName}) financial approval logged to audit trail.`,
        entityId: quotationId,
        type: 'APPROVAL',
      },
      {
        targetRole: 'CUSTOMER',
        userId: quote.customerId,
        title: '🎉 Your Quotation is Approved!',
        message: `Quotation ${quoteNumber} for ₹${orderTotal.toLocaleString('en-IN')} has been approved by our team! You can now review, negotiate, or e-sign.`,
        entityId: quotationId,
        type: 'APPROVAL',
      },
    ];

    await prisma.notification.createMany({ data: notifications });

    // 2. Broadcast live websocket event to all connected users (Admin, Manager, Rep, Buyer, Finance)
    broadcastQuotationApproved({
      quotationId: quote.id,
      quoteNumber,
      orderTotal,
      status: 'APPROVED',
      customerId: quote.customerId,
      customerName,
      repId: quote.repId,
      repName: quote.rep?.name,
      approvedBy: approverRole,
      approvedAt: new Date().toISOString(),
    });

    // 3. Broadcast to Dashboard websocket
    broadcastToDashboard('QUOTATION_APPROVED', {
      quotationId: quote.id,
      quoteNumber,
      status: 'APPROVED',
      orderTotal,
      customerName,
    });
  } catch (err) {
    console.error('Error triggering approval notifications:', err);
  }
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
