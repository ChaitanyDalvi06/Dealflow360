import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ─── DEAL HEALTH DASHBOARD DATA (polling fallback) ──────────
router.get('/deal-health', authenticate, authorize('SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN'), async (req, res, next) => {
  try {
    const stalledDaysThreshold = parseInt(req.query.stalledDays) || 3;
    const stalledDate = new Date();
    stalledDate.setDate(stalledDate.getDate() - stalledDaysThreshold);

    // ─── STALLED DEALS ──────────────────────────────────────
    const stalledDeals = await prisma.quotation.findMany({
      where: {
        lastActivityAt: { lt: stalledDate },
        status: { in: ['DRAFT', 'SENT', 'UNDER_NEGOTIATION', 'PENDING_MANAGER', 'PENDING_FINANCE'] },
      },
      include: {
        customer: { select: { name: true, tier: true, company: true } },
        rep: { select: { name: true } },
      },
      orderBy: { lastActivityAt: 'asc' },
      take: 20,
    });

    // ─── DISCOUNT ANOMALIES ─────────────────────────────────
    // Find quotation lines where discount significantly exceeds category limit
    const anomalyLines = await prisma.$queryRaw`
      SELECT 
        ql.id as "lineId",
        ql."quotationId",
        ql."discountPct",
        p.name as "productName",
        p.category,
        cdl."maxDiscountPct" as "categoryLimit",
        (ql."discountPct" - cdl."maxDiscountPct") as "overage",
        q.status as "quotationStatus",
        c.name as "customerName",
        u.name as "repName"
      FROM "QuotationLine" ql
      JOIN "Product" p ON ql."productId" = p.id
      JOIN "CategoryDiscountLimit" cdl ON p.category = cdl.category
      JOIN "Quotation" q ON ql."quotationId" = q.id
      JOIN "Customer" c ON q."customerId" = c.id
      JOIN "User" u ON q."repId" = u.id
      WHERE ql."discountPct" > cdl."maxDiscountPct"
      AND q.status NOT IN ('CANCELLED', 'REJECTED', 'COMPLETED')
      ORDER BY (ql."discountPct" - cdl."maxDiscountPct") DESC
      LIMIT 20
    `;

    // ─── PIPELINE SUMMARY ───────────────────────────────────
    const pipelineCounts = await prisma.quotation.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { orderTotal: true },
    });

    res.json({
      stalledDeals,
      discountAnomalies: anomalyLines,
      pipelineSummary: pipelineCounts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── REPORTS DATA ───────────────────────────────────────────
router.get('/reports', authenticate, authorize('SALES_MANAGER', 'FINANCE', 'ADMIN'), async (req, res, next) => {
  try {
    const { period, repId, status, category } = req.query;

    const where = {};
    if (status) where.status = status;
    if (repId) where.repId = repId;

    if (period) {
      const now = new Date();
      const periodMap = {
        '7d': 7, '30d': 30, '90d': 90, '365d': 365,
      };
      const days = periodMap[period] || 30;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      where.createdAt = { gte: startDate };
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { name: true, tier: true } },
        rep: { select: { name: true } },
        lines: {
          include: { product: { select: { name: true, category: true } } },
          ...(category && {
            where: { product: { category } },
          }),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute summary stats
    const totalDeals = quotations.length;
    const totalRevenue = quotations.reduce((sum, q) => sum + Number(q.orderTotal), 0);
    const totalMargin = quotations.reduce((sum, q) => sum + Number(q.totalMargin), 0);
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

    const statusBreakdown = {};
    for (const q of quotations) {
      statusBreakdown[q.status] = (statusBreakdown[q.status] || 0) + 1;
    }

    res.json({
      summary: { totalDeals, totalRevenue, totalMargin, avgDealSize, statusBreakdown },
      quotations,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
