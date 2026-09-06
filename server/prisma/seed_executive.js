import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedExecutiveData() {
  console.log('🚀 Starting Executive Dashboard DB Seeding...\n');

  // 1. Ensure Rep and Admin users exist
  let rep = await prisma.user.findFirst({ where: { role: 'SALES_REP' } });
  if (!rep) {
    const passwordHash = await bcrypt.hash('sales123', 10);
    rep = await prisma.user.create({
      data: {
        name: 'Sales Executive',
        email: 'sales@gmail.com',
        passwordHash,
        role: 'SALES_REP',
      },
    });
  }

  // 2. Customers required for the dashboard
  const customerDefs = [
    { name: 'Acme Corp', company: 'Acme Corporation', email: 'procurement@acme.com', tier: 'GOLD' },
    { name: 'TechNova', company: 'TechNova Systems', email: 'orders@technova.io', tier: 'GOLD' },
    { name: 'Globex Ltd', company: 'Globex International', email: 'contact@globex.org', tier: 'SILVER' },
    { name: 'Innotech', company: 'Innotech Labs', email: 'purchase@innotech.com', tier: 'GOLD' },
    { name: 'Vertex Solutions', company: 'Vertex Solutions Pvt Ltd', email: 'it@vertex.in', tier: 'SILVER' },
    { name: 'CloudSoft Solutions', company: 'CloudSoft Solutions', email: 'admin@cloudsoft.io', tier: 'GOLD' },
    { name: 'TechCorp India', company: 'TechCorp India Pvt Ltd', email: 'buying@techcorp.in', tier: 'GOLD' },
    { name: 'FinServe Banking', company: 'FinServe Banking Ltd', email: 'infra@finserve.bank', tier: 'GOLD' },
    { name: 'DataMind Analytics', company: 'DataMind Analytics', email: 'procure@datamind.co', tier: 'SILVER' },
    { name: 'MegaRetail Corp', company: 'MegaRetail Corp', email: 'supply@megaretail.com', tier: 'GOLD' },
    { name: 'EduLearn Academy', company: 'EduLearn Academy', email: 'ops@edulearn.org', tier: 'BRONZE' },
    { name: 'HealthPlus Clinics', company: 'HealthPlus Clinics', email: 'director@healthplus.in', tier: 'BRONZE' },
  ];

  const customerMap = {};
  for (const c of customerDefs) {
    let existing = await prisma.customer.findUnique({ where: { email: c.email } });
    if (!existing) {
      existing = await prisma.customer.create({ data: c });
    }
    customerMap[c.name] = existing;
  }
  console.log(`✅ Verified/Created ${Object.keys(customerMap).length} customers`);

  // 3. Products matching the dashboard's "Top Products by Revenue"
  const productDefs = [
    { name: 'Laptops', category: 'Hardware', basePrice: 85000, margin: 24, isRecurring: false },
    { name: 'Cloud Subscription', category: 'Software', basePrice: 120000, margin: 68, isRecurring: true },
    { name: 'Installation Services', category: 'Service', basePrice: 25000, margin: 30, isRecurring: false },
    { name: 'Monitors', category: 'Hardware', basePrice: 32000, margin: 25, isRecurring: false },
    { name: 'Premium Support', category: 'Service', basePrice: 30000, margin: 40, isRecurring: true },
  ];

  const productMap = {};
  for (const p of productDefs) {
    let existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      existing = await prisma.product.create({ data: p });
    }
    productMap[p.name] = existing;
  }
  console.log(`✅ Verified/Created ${Object.keys(productMap).length} executive products`);

  // 4. Warehouses with realistic utilization
  const warehouseDefs = [
    { name: 'Mumbai', location: 'Mumbai Central Logistics Hub', shippingCostWeight: 1.0, utilTarget: 78 },
    { name: 'Pune', location: 'Pune Regional Hub', shippingCostWeight: 1.1, utilTarget: 62 },
    { name: 'Bangalore', location: 'Bangalore Tech Depot', shippingCostWeight: 1.2, utilTarget: 45 },
    { name: 'Delhi', location: 'Delhi NCR Fulfillment Center', shippingCostWeight: 1.3, utilTarget: 38 },
    { name: 'Hyderabad', location: 'Hyderabad Distribution Park', shippingCostWeight: 1.4, utilTarget: 27 },
  ];

  const warehouseMap = {};
  for (const w of warehouseDefs) {
    let existing = await prisma.warehouse.findFirst({ where: { name: w.name } });
    if (!existing) {
      existing = await prisma.warehouse.create({
        data: {
          name: w.name,
          location: w.location,
          shippingCostWeight: w.shippingCostWeight,
        },
      });
    }
    warehouseMap[w.name] = existing;

    // Seed stock levels representing capacity & utilization
    for (const prod of Object.values(productMap)) {
      const stockQty = Math.round(w.utilTarget * (prod.isRecurring ? 1 : 2.5));
      await prisma.stockLevel.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: existing.id,
            productId: prod.id,
          },
        },
        create: {
          warehouseId: existing.id,
          productId: prod.id,
          quantity: stockQty,
        },
        update: {
          quantity: stockQty,
        },
      });
    }
  }
  console.log(`✅ Verified/Created ${Object.keys(warehouseMap).length} warehouses`);

  // 5. Seed Funnel Leads (128 total)
  const currentLeadCount = await prisma.requirement.count();
  if (currentLeadCount < 128) {
    const custKeys = Object.keys(customerMap);
    const toCreate = 128 - currentLeadCount;
    const reqData = [];
    for (let i = 0; i < toCreate; i++) {
      const cust = customerMap[custKeys[i % custKeys.length]];
      let status = 'NEW';
      if (i < 41) status = 'NEW';
      else if (i < 82) status = 'ASSIGNED';
      else if (i < 110) status = 'IN_REVIEW';
      else status = 'CONVERTED';

      reqData.push({
        customerId: cust.id,
        title: `Enterprise IT Procurement Request #${1000 + i}`,
        notes: `Procurement inquiry for hardware & software solutions.`,
        desiredItems: [{ productId: productMap['Laptops'].id, quantity: (i % 5) + 1 }],
        status,
        assignedRepId: rep.id,
        createdAt: new Date(2026, Math.floor(i / 16), (i % 25) + 1),
      });
    }
    await prisma.requirement.createMany({ data: reqData });
    console.log(`✅ Seeded funnel leads to reach 128 total requirements`);
  }

  // 6. Clear old quotations to seed the coherent 48 active quotations
  // and clean historical monthly revenue distribution
  console.log('🔄 Re-seeding coherent 48 executive quotations...');
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billingSchedule.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.warehouseSplit.deleteMany();
  await prisma.negotiationEvent.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();

  // Status breakdown target:
  // Won: 5
  // Negotiation: 9
  // Sent to Customer: 14
  // Pending Approval: 8
  // Draft: 12
  // Total = 48 quotations

  // Deal Health breakdown target:
  // On Track: 26 (risk score 0 - 3)
  // At Risk: 14 (risk score 4 - 6)
  // Stalled: 8 (risk score 7 - 10)

  // Precise target product revenues:
  // Laptops: ~42.5L
  // Cloud Subscription: ~28.3L
  // Installation Services: ~18.7L
  // Monitors: ~12.4L
  // Premium Support: ~8.1L
  // Total ~ 1.10 Cr + base margin ~ 1.24 Cr

  // Specific 5 Recent Deals shown on the front dashboard:
  const recentDealsConfig = [
    {
      code: 'Q-1042',
      customer: 'Acme Corp',
      value: 2450000,
      status: 'PENDING_MANAGER',
      stage: 'Negotiation',
      health: 'On Track',
      riskScore: 2,
      hoursAgo: 2,
      month: 7, // August
      items: [
        { prod: 'Laptops', qty: 18, price: 85000, disc: 5 }, // 14.53L
        { prod: 'Installation Services', qty: 15, price: 25000, disc: 0 }, // 3.75L
        { prod: 'Premium Support', qty: 22, price: 30000, disc: 6 }, // 6.22L
      ],
    },
    {
      code: 'Q-1041',
      customer: 'TechNova',
      value: 1230000,
      status: 'SENT',
      stage: 'Proposal',
      health: 'On Track',
      riskScore: 1,
      hoursAgo: 5,
      month: 7,
      items: [
        { prod: 'Cloud Subscription', qty: 8, price: 120000, disc: 6 }, // 9.02L
        { prod: 'Monitors', qty: 11, price: 32000, disc: 7 }, // 3.28L
      ],
    },
    {
      code: 'Q-1040',
      customer: 'Globex Ltd',
      value: 870000,
      status: 'UNDER_NEGOTIATION',
      stage: 'Negotiation',
      health: 'At Risk',
      riskScore: 5,
      hoursAgo: 24,
      month: 7,
      items: [
        { prod: 'Laptops', qty: 8, price: 85000, disc: 7 }, // 6.32L
        { prod: 'Installation Services', qty: 10, price: 25000, disc: 5 }, // 2.38L
      ],
    },
    {
      code: 'Q-1039',
      customer: 'Innotech',
      value: 1890000,
      status: 'CONFIRMED',
      stage: 'Closed',
      health: 'On Track',
      riskScore: 0,
      hoursAgo: 48,
      month: 7,
      items: [
        { prod: 'Cloud Subscription', qty: 13, price: 120000, disc: 5 }, // 14.82L
        { prod: 'Monitors', qty: 13, price: 32000, disc: 2 }, // 4.08L
      ],
    },
    {
      code: 'Q-1038',
      customer: 'Vertex Solutions',
      value: 560000,
      status: 'SENT',
      stage: 'Proposal',
      health: 'At Risk',
      riskScore: 6,
      hoursAgo: 52,
      month: 7,
      items: [
        { prod: 'Monitors', qty: 10, price: 32000, disc: 10 }, // 2.88L
        { prod: 'Installation Services', qty: 11, price: 25000, disc: 1 }, // 2.72L
      ],
    },
  ];

  // Remaining 43 deals:
  // Status pool:
  // CONFIRMED (4), UNDER_NEGOTIATION (8), SENT (12), PENDING_FINANCE (7), DRAFT (12)
  const remainingStatusPool = [
    ...Array(4).fill('CONFIRMED'),
    ...Array(8).fill('UNDER_NEGOTIATION'),
    ...Array(12).fill('SENT'),
    ...Array(7).fill('PENDING_FINANCE'),
    ...Array(12).fill('DRAFT'),
  ];

  // Health risk scores:
  // On Track (23 deals): score 1-3
  // At Risk (12 deals): score 4-6
  // Stalled (8 deals): score 7-9
  const remainingRiskPool = [
    ...Array(23).fill(2),
    ...Array(12).fill(5),
    ...Array(8).fill(8),
  ];

  // Monthly breakdown for the remaining 43 quotes:
  // Jan (month 0): 2 quotes
  // Feb (month 1): 3 quotes
  // Mar (month 2): 4 quotes
  // Apr (month 3): 5 quotes
  // May (month 4): 5 quotes
  // Jun (month 5): 6 quotes
  // Jul (month 6): 8 quotes
  // Aug (month 7): 10 quotes (+ 5 recent = 15 quotes in Aug)
  const monthOffsets = [
    0, 0,
    1, 1, 1,
    2, 2, 2, 2,
    3, 3, 3, 3, 3,
    4, 4, 4, 4, 4,
    5, 5, 5, 5, 5, 5,
    6, 6, 6, 6, 6, 6, 6, 6,
    7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  ];

  const allCustNames = Object.keys(customerMap);

  // First create the 5 specific recent deals
  for (const rd of recentDealsConfig) {
    const cust = customerMap[rd.customer];
    const createdDate = new Date();
    createdDate.setHours(createdDate.getHours() - rd.hoursAgo);

    let calcTotal = 0;
    let calcMargin = 0;
    const computedItems = rd.items.map(item => {
      const prod = productMap[item.prod];
      const lineTotal = Math.round(item.qty * item.price * (1 - item.disc / 100));
      const lineMargin = Math.round(lineTotal * (Number(prod.margin) / 100));
      calcTotal += lineTotal;
      calcMargin += lineMargin;
      return { ...item, prodObj: prod, lineTotal, lineMargin };
    });

    const quote = await prisma.quotation.create({
      data: {
        customerId: cust.id,
        repId: rep.id,
        status: rd.status,
        blendedRiskScore: rd.riskScore,
        orderTotal: calcTotal,
        totalMargin: calcMargin,
        notes: `Ref #${rd.code} - ${rd.stage} stage deal.`,
        createdAt: createdDate,
        lastActivityAt: createdDate,
      },
    });

    for (const item of computedItems) {
      await prisma.quotationLine.create({
        data: {
          quotationId: quote.id,
          productId: item.prodObj.id,
          quantity: item.qty,
          unitPrice: item.price,
          discountPct: item.disc,
          lineTotal: item.lineTotal,
          lineMargin: item.lineMargin,
          isRecurring: item.prodObj.isRecurring,
        },
      });
    }
  }

  // Pre-configured item lines for remaining 43 quotes to reach target totals:
  // Laptops: target ~42.5L - 20.85L (recent) = ~21.65L needed (~26 units @ 85k)
  // Cloud Subscription: target ~28.3L - 23.84L (recent) = ~4.46L needed (~4 units @ 120k)
  // Installation Services: target ~18.7L - 8.85L (recent) = ~9.85L needed (~40 units @ 25k)
  // Monitors: target ~12.4L - 10.24L (recent) = ~2.16L needed (~7 units @ 32k)
  // Premium Support: target ~8.1L - 6.22L (recent) = ~1.88L needed (~6 units @ 30k)

  const lineTemplates = [
    { prod: 'Laptops', qty: 2, price: 85000, disc: 5 }, // 1.61L
    { prod: 'Installation Services', qty: 4, price: 25000, disc: 0 }, // 1.00L
    { prod: 'Laptops', qty: 1, price: 85000, disc: 3 }, // 0.82L
    { prod: 'Cloud Subscription', qty: 1, price: 120000, disc: 5 }, // 1.14L
    { prod: 'Installation Services', qty: 3, price: 25000, disc: 0 }, // 0.75L
    { prod: 'Monitors', qty: 2, price: 32000, disc: 4 }, // 0.61L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 8 }, // 1.56L
    { prod: 'Premium Support', qty: 2, price: 30000, disc: 0 }, // 0.60L
    { prod: 'Installation Services', qty: 2, price: 25000, disc: 2 }, // 0.49L
    { prod: 'Cloud Subscription', qty: 1, price: 120000, disc: 8 }, // 1.10L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 4 }, // 1.63L
    { prod: 'Monitors', qty: 2, price: 32000, disc: 2 }, // 0.63L
    { prod: 'Installation Services', qty: 3, price: 25000, disc: 0 }, // 0.75L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 6 }, // 1.60L
    { prod: 'Premium Support', qty: 2, price: 30000, disc: 5 }, // 0.57L
    { prod: 'Cloud Subscription', qty: 1, price: 120000, disc: 10 }, // 1.08L
    { prod: 'Installation Services', qty: 4, price: 25000, disc: 2 }, // 0.98L
    { prod: 'Laptops', qty: 1, price: 85000, disc: 0 }, // 0.85L
    { prod: 'Monitors', qty: 1, price: 32000, disc: 0 }, // 0.32L
    { prod: 'Installation Services', qty: 2, price: 25000, disc: 0 }, // 0.50L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 5 }, // 1.61L
    { prod: 'Premium Support', qty: 2, price: 30000, disc: 0 }, // 0.60L
    { prod: 'Installation Services', qty: 3, price: 25000, disc: 0 }, // 0.75L
    { prod: 'Cloud Subscription', qty: 1, price: 120000, disc: 6 }, // 1.13L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 4 }, // 1.63L
    { prod: 'Monitors', qty: 2, price: 32000, disc: 5 }, // 0.61L
    { prod: 'Installation Services', qty: 2, price: 25000, disc: 0 }, // 0.50L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 5 }, // 1.61L
    { prod: 'Installation Services', qty: 3, price: 25000, disc: 0 }, // 0.75L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 4 }, // 1.63L
    { prod: 'Installation Services', qty: 2, price: 25000, disc: 0 }, // 0.50L
    { prod: 'Laptops', qty: 1, price: 85000, disc: 2 }, // 0.83L
    { prod: 'Installation Services', qty: 2, price: 25000, disc: 0 }, // 0.50L
    { prod: 'Laptops', qty: 2, price: 85000, disc: 6 }, // 1.60L
    { prod: 'Installation Services', qty: 2, price: 25000, disc: 0 }, // 0.50L
    { prod: 'Laptops', qty: 1, price: 85000, disc: 0 }, // 0.85L
    { prod: 'Installation Services', qty: 2, price: 25000, disc: 0 }, // 0.50L
    { prod: 'Laptops', qty: 1, price: 85000, disc: 2 }, // 0.83L
    { prod: 'Installation Services', qty: 1, price: 25000, disc: 0 }, // 0.25L
    { prod: 'Laptops', qty: 1, price: 85000, disc: 5 }, // 0.81L
    { prod: 'Installation Services', qty: 1, price: 25000, disc: 0 }, // 0.25L
    { prod: 'Laptops', qty: 1, price: 85000, disc: 5 }, // 0.81L
    { prod: 'Installation Services', qty: 1, price: 25000, disc: 0 }, // 0.25L
  ];

  for (let i = 0; i < 43; i++) {
    const custName = allCustNames[i % allCustNames.length];
    const cust = customerMap[custName];
    const status = remainingStatusPool[i];
    const risk = remainingRiskPool[i];
    const month = monthOffsets[i] ?? 7;
    const day = (i * 3) % 26 + 1;
    const createdDate = new Date(2026, month, day, 10 + (i % 8), (i * 11) % 55);

    const isStalled = risk >= 7;
    const lastActive = isStalled 
      ? new Date(createdDate.getTime() - 7 * 86400000)
      : new Date(createdDate.getTime() + 12 * 3600000);

    const tmpl = lineTemplates[i % lineTemplates.length];
    const prod = productMap[tmpl.prod];
    const lineTotal = Math.round(tmpl.qty * tmpl.price * (1 - tmpl.disc / 100));
    const lineMargin = Math.round(lineTotal * (Number(prod.margin) / 100));

    const quoteCode = `Q-${1037 - i}`;
    const quote = await prisma.quotation.create({
      data: {
        customerId: cust.id,
        repId: rep.id,
        status,
        blendedRiskScore: risk,
        orderTotal: lineTotal,
        totalMargin: lineMargin,
        notes: `Ref #${quoteCode} - Standard deal execution.`,
        createdAt: createdDate,
        lastActivityAt: lastActive,
      },
    });

    await prisma.quotationLine.create({
      data: {
        quotationId: quote.id,
        productId: prod.id,
        quantity: tmpl.qty,
        unitPrice: tmpl.price,
        discountPct: tmpl.disc,
        lineTotal,
        lineMargin,
        isRecurring: prod.isRecurring,
      },
    });
  }

  const finalQuoteCount = await prisma.quotation.count();
  const totalValAgg = await prisma.quotation.aggregate({ _sum: { orderTotal: true } });
  console.log(`\n🎉 DB SEEDING COMPLETE!`);
  console.log(`   Quotations count: ${finalQuoteCount}`);
  console.log(`   Total Deal Value: ₹${(Number(totalValAgg._sum.orderTotal || 0) / 10000000).toFixed(2)} Cr`);
}

seedExecutiveData()
  .catch((err) => {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
