import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Upserting requested users with default passwords...');

  const accounts = [
    {
      email: 'admin@gmail.com',
      name: 'System Admin',
      pass: 'admin123',
      role: 'ADMIN',
    },
    {
      email: 'sales@gmail.com',
      name: 'Sales Executive',
      pass: 'sales123',
      role: 'SALES_REP',
    },
    {
      email: 'marketing@gmail.com',
      name: 'Marketing / Sales Manager',
      pass: 'marketing123',
      role: 'SALES_MANAGER',
    },
    {
      email: 'buyer@gmail.com',
      name: 'Enterprise Buyer',
      pass: 'buyer123',
      role: 'CUSTOMER',
    },
  ];

  for (const acc of accounts) {
    const passwordHash = await bcrypt.hash(acc.pass, 10);
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        passwordHash,
        role: acc.role,
      },
      create: {
        email: acc.email,
        name: acc.name,
        passwordHash,
        role: acc.role,
      },
    });
    console.log(`✅ User ready: ${user.email} (Role: ${user.role}) with password: ${acc.pass}`);
  }

  // Also ensure buyer@gmail.com is in Customer table for Portal access
  const buyerHash = await bcrypt.hash('buyer123', 10);
  const customer = await prisma.customer.upsert({
    where: { email: 'buyer@gmail.com' },
    update: {
      name: 'Global Enterprise Buyer',
      company: 'Global Enterprises Inc.',
      passwordHash: buyerHash,
      tier: 'GOLD',
    },
    create: {
      email: 'buyer@gmail.com',
      name: 'Global Enterprise Buyer',
      company: 'Global Enterprises Inc.',
      passwordHash: buyerHash,
      tier: 'GOLD',
    },
  });
  console.log(`✅ Customer portal account ready: ${customer.email} with password: buyer123`);
}

main()
  .catch((e) => {
    console.error('Error seeding custom users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
