import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DealFlow360 database...\n');

  // ─── CLEAR EXISTING DATA ─────────────────────────────────
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billingSchedule.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.warehouseSplit.deleteMany();
  await prisma.negotiationEvent.deleteMany();
  await prisma.orderHistory.deleteMany();
  await prisma.upsellRule.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.priceListEntry.deleteMany();
  await prisma.categoryDiscountLimit.deleteMany();
  await prisma.discountTier.deleteMany();
  await prisma.approvalConfig.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // ─── USERS ────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    { name: 'Admin User', email: 'admin@dealflow.io', passwordHash, role: 'ADMIN' },
    { name: 'Aarav Sharma', email: 'sales@dealflow.io', passwordHash, role: 'SALES_REP' },
    { name: 'Priya Patel', email: 'manager@dealflow.io', passwordHash, role: 'SALES_MANAGER' },
    { name: 'Vikram Malhotra', email: 'director@dealflow.io', passwordHash, role: 'SALES_MANAGER' },
    { name: 'Anita Desai', email: 'finance@dealflow.io', passwordHash, role: 'FINANCE' },
    // Requested Default Accounts
    { name: 'System Admin', email: 'admin@gmail.com', passwordHash: await bcrypt.hash('admin123', 10), role: 'ADMIN' },
    { name: 'Sales Executive', email: 'sales@gmail.com', passwordHash: await bcrypt.hash('sales123', 10), role: 'SALES_REP' },
    { name: 'Marketing / Sales Manager', email: 'marketing@gmail.com', passwordHash: await bcrypt.hash('marketing123', 10), role: 'SALES_MANAGER' },
    { name: 'Enterprise Buyer', email: 'buyer@gmail.com', passwordHash: await bcrypt.hash('buyer123', 10), role: 'CUSTOMER' },
  ];

  const users = [];
  for (const u of usersData) {
    const user = await prisma.user.create({ data: u });
    users.push(user);
  }
  console.log(`✅ Created ${users.length} users`);

  // ─── CUSTOMERS ────────────────────────────────────────────
  const customerPasswordHash = await bcrypt.hash('customer123', 10);

  const customersData = [
    { name: 'Global Enterprise Buyer', email: 'buyer@gmail.com', tier: 'GOLD', company: 'Global Enterprises Inc', phone: '+91-9876543200', passwordHash: await bcrypt.hash('buyer123', 10) },
    { name: 'TechCorp India', email: 'procurement@techcorp.in', tier: 'GOLD', company: 'TechCorp India Pvt Ltd', phone: '+91-9876543210', passwordHash: customerPasswordHash },
    { name: 'CloudSoft Solutions', email: 'orders@cloudsoft.io', tier: 'GOLD', company: 'CloudSoft Solutions', phone: '+91-9876543211', passwordHash: customerPasswordHash },
    { name: 'DataMind Analytics', email: 'buying@datamind.co', tier: 'SILVER', company: 'DataMind Analytics', phone: '+91-9876543212', passwordHash: customerPasswordHash },
    { name: 'GreenLeaf Enterprises', email: 'purchase@greenleaf.in', tier: 'SILVER', company: 'GreenLeaf Enterprises', phone: '+91-9876543213', passwordHash: customerPasswordHash },
    { name: 'StartupHub Incubator', email: 'admin@startuphub.co', tier: 'BRONZE', company: 'StartupHub Incubator', phone: '+91-9876543214', passwordHash: customerPasswordHash },
    { name: 'MegaRetail Corp', email: 'ops@megaretail.com', tier: 'GOLD', company: 'MegaRetail Corp', phone: '+91-9876543215', passwordHash: customerPasswordHash },
    { name: 'FinServe Banking', email: 'it@finserve.bank', tier: 'GOLD', company: 'FinServe Banking Ltd', phone: '+91-9876543216', passwordHash: customerPasswordHash },
    { name: 'EduLearn Academy', email: 'tech@edulearn.org', tier: 'SILVER', company: 'EduLearn Academy', phone: '+91-9876543217', passwordHash: customerPasswordHash },
    { name: 'HealthPlus Clinics', email: 'admin@healthplus.in', tier: 'BRONZE', company: 'HealthPlus Clinics', phone: '+91-9876543218', passwordHash: customerPasswordHash },
    { name: 'LogiMove Transport', email: 'fleet@logimove.in', tier: 'BRONZE', company: 'LogiMove Transport', phone: '+91-9876543219', passwordHash: customerPasswordHash },
  ];

  const customers = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({ data: c });
    customers.push(cust);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // ─── PRODUCTS ─────────────────────────────────────────────
  const rawProducts = [
    // Hardware
    { name: 'ProBook Laptop 15"', category: 'Hardware', basePrice: 85000, margin: 22, taxRate: 18, description: 'Business-grade laptop with i7 processor' },
    { name: 'UltraDesk Monitor 27"', category: 'Hardware', basePrice: 32000, margin: 25, taxRate: 18, description: '4K IPS display for professionals' },
    { name: 'ErgoMax Keyboard', category: 'Hardware', basePrice: 5500, margin: 35, taxRate: 18, description: 'Mechanical ergonomic keyboard' },
    { name: 'NetSwitch Pro 24-Port', category: 'Hardware', basePrice: 45000, margin: 20, taxRate: 18, description: 'Managed Ethernet switch' },
    { name: 'ServerRack PowerEdge', category: 'Hardware', basePrice: 250000, margin: 18, taxRate: 18, description: 'Enterprise rack server' },
    // Software
    { name: 'CloudSuite ERP License', category: 'Software', basePrice: 120000, margin: 65, taxRate: 18, description: 'Annual ERP software license', isRecurring: true },
    { name: 'SecureVault Backup', category: 'Software', basePrice: 25000, margin: 70, taxRate: 18, description: 'Cloud backup solution', isRecurring: true },
    { name: 'DataViz Analytics Pro', category: 'Software', basePrice: 45000, margin: 72, taxRate: 18, description: 'Business intelligence platform', isRecurring: true },
    { name: 'DevOps Pipeline Suite', category: 'Software', basePrice: 60000, margin: 68, taxRate: 18, description: 'CI/CD and DevOps toolchain', isRecurring: true },
    { name: 'OfficeMax Productivity', category: 'Software', basePrice: 8000, margin: 80, taxRate: 18, description: 'Office productivity suite', isRecurring: true },
    // Services
    { name: 'On-Site Setup & Installation', category: 'Service', basePrice: 15000, margin: 12, taxRate: 18, description: 'Hardware setup and installation service' },
    { name: 'Network Configuration', category: 'Service', basePrice: 20000, margin: 10, taxRate: 18, description: 'Enterprise network setup and config' },
    { name: 'Data Migration Service', category: 'Service', basePrice: 35000, margin: 8, taxRate: 18, description: 'Full data migration and validation' },
    { name: 'Staff Training Program', category: 'Service', basePrice: 18000, margin: 15, taxRate: 18, description: '2-day on-site training' },
    { name: 'Premium Support Plan', category: 'Service', basePrice: 30000, margin: 14, taxRate: 18, description: '24/7 priority support', isRecurring: true },
    // Accessories
    { name: 'Laptop Carry Case', category: 'Accessories', basePrice: 2500, margin: 45, taxRate: 18, description: 'Premium leather laptop bag' },
    { name: 'Wireless Mouse Pro', category: 'Accessories', basePrice: 2000, margin: 50, taxRate: 18, description: 'Ergonomic wireless mouse' },
    { name: 'USB-C Hub 7-in-1', category: 'Accessories', basePrice: 3500, margin: 40, taxRate: 18, description: 'Multi-port USB-C docking hub' },
    { name: 'Extended Warranty 3-Year', category: 'Accessories', basePrice: 8000, margin: 55, taxRate: 18, description: 'Extended hardware warranty', isPromoted: true },
    { name: 'Security Cable Lock', category: 'Accessories', basePrice: 1200, margin: 60, taxRate: 18, description: 'Kensington-style security lock' },
  ];

  const products = [];
  for (const p of rawProducts) {
    const prod = await prisma.product.create({ data: p });
    products.push(prod);
  }
  console.log(`✅ Created ${products.length} products`);

  // ─── PRICE LIST ENTRIES ───────────────────────────────────
  for (const product of products) {
    const base = Number(product.basePrice);
    await prisma.priceListEntry.create({
      data: { productId: product.id, customerTier: 'BRONZE', price: base },
    });
    await prisma.priceListEntry.create({
      data: { productId: product.id, customerTier: 'SILVER', price: Math.round(base * 0.95) },
    });
    await prisma.priceListEntry.create({
      data: { productId: product.id, customerTier: 'GOLD', price: Math.round(base * 0.90) },
    });
  }
  console.log(`✅ Created price list entries`);

  // ─── DISCOUNT TIERS ──────────────────────────────────────
  await prisma.discountTier.create({ data: { customerTier: 'BRONZE', maxDiscountPct: 5 } });
  await prisma.discountTier.create({ data: { customerTier: 'SILVER', maxDiscountPct: 10 } });
  await prisma.discountTier.create({ data: { customerTier: 'GOLD', maxDiscountPct: 15 } });
  console.log('✅ Created discount tiers (Bronze: 5%, Silver: 10%, Gold: 15%)');

  // ─── CATEGORY DISCOUNT LIMITS ─────────────────────────────
  await prisma.categoryDiscountLimit.create({ data: { category: 'Hardware', maxDiscountPct: 15 } });
  await prisma.categoryDiscountLimit.create({ data: { category: 'Software', maxDiscountPct: 12 } });
  await prisma.categoryDiscountLimit.create({ data: { category: 'Service', maxDiscountPct: 10 } });
  await prisma.categoryDiscountLimit.create({ data: { category: 'Accessories', maxDiscountPct: 20 } });
  console.log('✅ Created category discount limits');

  // ─── APPROVAL CONFIG ──────────────────────────────────────
  await prisma.approvalConfig.create({
    data: { managerThreshold: 0, financeThreshold: 5 },
  });
  console.log('✅ Created approval config');

  // ─── WAREHOUSES ───────────────────────────────────────────
  const warehousesData = [
    { name: 'Mumbai Central Warehouse', location: 'Mumbai, Maharashtra', shippingCostWeight: 1.0 },
    { name: 'Delhi NCR Warehouse', location: 'Gurugram, Haryana', shippingCostWeight: 1.2 },
    { name: 'Bangalore Tech Hub', location: 'Bangalore, Karnataka', shippingCostWeight: 1.5 },
  ];

  const warehouses = [];
  for (const w of warehousesData) {
    const wh = await prisma.warehouse.create({ data: w });
    warehouses.push(wh);
  }
  console.log(`✅ Created ${warehouses.length} warehouses`);

  // ─── STOCK LEVELS ─────────────────────────────────────────
  for (const product of products) {
    if (['Hardware', 'Accessories'].includes(product.category)) {
      for (const warehouse of warehouses) {
        const qty = Math.floor(Math.random() * 40) + 10;
        await prisma.stockLevel.create({
          data: { warehouseId: warehouse.id, productId: product.id, quantity: qty },
        });
      }
    }
  }
  console.log(`✅ Created stock levels`);

  // ─── SUBSCRIPTION PLANS ───────────────────────────────────
  const recurringProducts = products.filter(p => p.isRecurring);
  const planTypes = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
  const intervals = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

  for (let i = 0; i < recurringProducts.length; i++) {
    const planType = planTypes[i % planTypes.length];
    await prisma.subscriptionPlan.create({
      data: {
        productId: recurringProducts[i].id,
        planType,
        intervalMonths: intervals[planType],
        prorateOnChange: true,
      },
    });
  }
  console.log(`✅ Created ${recurringProducts.length} subscription plans`);

  // ─── UPSELL RULES ─────────────────────────────────────────
  const laptop = products.find(p => p.name.includes('Laptop'));
  const monitor = products.find(p => p.name.includes('Monitor'));
  const keyboard = products.find(p => p.name.includes('Keyboard'));
  const mouse = products.find(p => p.name.includes('Mouse'));
  const carryCase = products.find(p => p.name.includes('Carry Case'));
  const warranty = products.find(p => p.name.includes('Warranty'));
  const usbHub = products.find(p => p.name.includes('USB-C'));
  const setup = products.find(p => p.name.includes('Setup'));
  const training = products.find(p => p.name.includes('Training'));
  const erp = products.find(p => p.name.includes('ERP'));
  const backup = products.find(p => p.name.includes('Backup'));
  const support = products.find(p => p.name.includes('Support'));
  const netSwitch = products.find(p => p.name.includes('NetSwitch'));
  const server = products.find(p => p.name.includes('ServerRack'));

  const upsellRules = [
    { source: laptop, target: warranty, delta: 4400 },
    { source: laptop, target: carryCase, delta: 1125 },
    { source: laptop, target: mouse, delta: 1000 },
    { source: laptop, target: usbHub, delta: 1400 },
    { source: laptop, target: monitor, delta: 8000 },
    { source: monitor, target: keyboard, delta: 1925 },
    { source: server, target: setup, delta: 1800 },
    { source: server, target: support, delta: 4200 },
    { source: netSwitch, target: server, delta: 45000 },
    { source: erp, target: training, delta: 2700 },
    { source: erp, target: backup, delta: 17500 },
    { source: erp, target: support, delta: 4200 },
  ];

  for (const rule of upsellRules) {
    if (rule.source && rule.target) {
      await prisma.upsellRule.create({
        data: {
          sourceProductId: rule.source.id,
          targetProductId: rule.target.id,
          marginDelta: rule.delta,
          isPromoted: rule.target.isPromoted,
        },
      });
    }
  }
  console.log(`✅ Created upsell rules`);

  // ─── ORDER HISTORY ─────────────────────────────────────────
  const orderHistoryEntries = [];
  for (let i = 0; i < 150; i++) {
    const orderId = uuid();
    const numProducts = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    const orderProducts = shuffled.slice(0, numProducts);

    for (const p of orderProducts) {
      orderHistoryEntries.push({ orderId, productId: p.id });
    }
  }
  await prisma.orderHistory.createMany({ data: orderHistoryEntries });
  console.log(`✅ Created ${orderHistoryEntries.length} order history records`);

  console.log('\n🎉 Seed complete! DealFlow360 database is populated and ready.\n');
  console.log('Login credentials:');
  console.log('  Admin:       admin@dealflow.io / password123');
  console.log('  Sales Rep:   sales@dealflow.io / password123');
  console.log('  Manager:     manager@dealflow.io / password123');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
