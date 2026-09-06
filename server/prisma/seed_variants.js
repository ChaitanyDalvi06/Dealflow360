import prisma from '../src/config/db.js';

async function seedVariantsAndPriceLists() {
  console.log('🌱 Seeding Product Variants and Tier-Based Price Lists...');

  const products = await prisma.product.findMany();

  for (const product of products) {
    const base = Number(product.basePrice);

    // 1. Seed Product Variants
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });

    let variantsToCreate = [];
    const nameLower = product.name.toLowerCase();
    const catLower = product.category.toLowerCase();

    if (nameLower.includes('laptop')) {
      variantsToCreate = [
        { attribute: 'Config', value: '16GB RAM / 512GB SSD', extraPrice: 0, sku: `LAP-16-512` },
        { attribute: 'Config', value: '32GB RAM / 1TB SSD', extraPrice: 15000, sku: `LAP-32-1TB` },
        { attribute: 'Config', value: '64GB RAM / 2TB Pro', extraPrice: 35000, sku: `LAP-64-2TB` },
      ];
    } else if (nameLower.includes('cloud') || catLower.includes('software')) {
      variantsToCreate = [
        { attribute: 'Tier', value: 'Professional (10 Users)', extraPrice: 0, sku: `CLOUD-PRO-10` },
        { attribute: 'Tier', value: 'Enterprise (50 Users)', extraPrice: 45000, sku: `CLOUD-ENT-50` },
        { attribute: 'Tier', value: 'Global Unlimited', extraPrice: 95000, sku: `CLOUD-UNLIM` },
      ];
    } else if (nameLower.includes('monitor')) {
      variantsToCreate = [
        { attribute: 'Display', value: '27" 4K UHD 60Hz', extraPrice: 0, sku: `MON-27-4K` },
        { attribute: 'Display', value: '34" Curved WQHD 144Hz', extraPrice: 12000, sku: `MON-34-CRV` },
      ];
    } else if (catLower.includes('service') || nameLower.includes('support') || nameLower.includes('installation')) {
      variantsToCreate = [
        { attribute: 'SLA / Scope', value: 'Standard Business Hours', extraPrice: 0, sku: `SRV-STD` },
        { attribute: 'SLA / Scope', value: 'Priority 24/7 Rapid Response', extraPrice: 15000, sku: `SRV-PRI-247` },
        { attribute: 'SLA / Scope', value: 'Dedicated On-Site Architect', extraPrice: 35000, sku: `SRV-DED-ONSITE` },
      ];
    } else {
      variantsToCreate = [
        { attribute: 'Pack Size', value: 'Single Unit (Standard)', extraPrice: 0, sku: `ACC-1PK` },
        { attribute: 'Pack Size', value: 'Corporate Pack of 5', extraPrice: Math.round(base * 3.8), sku: `ACC-5PK` },
      ];
    }

    for (const v of variantsToCreate) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          attribute: v.attribute,
          value: v.value,
          extraPrice: v.extraPrice,
          sku: v.sku,
        },
      });
    }

    // 2. Seed PriceListEntry (Tier & Currency Specific Rules)
    // Gold customers get special pre-negotiated base price (~10% off)
    // Silver gets ~5% off, Bronze gets standard basePrice
    // USD currency rate: approx 1 USD = 85 INR
    const tierPricing = [
      { customerTier: 'BRONZE', currency: 'INR', price: base },
      { customerTier: 'SILVER', currency: 'INR', price: Math.round(base * 0.95) },
      { customerTier: 'GOLD', currency: 'INR', price: Math.round(base * 0.90) },
      { customerTier: 'BRONZE', currency: 'USD', price: Math.round((base / 85) * 100) / 100 },
      { customerTier: 'SILVER', currency: 'USD', price: Math.round(((base * 0.95) / 85) * 100) / 100 },
      { customerTier: 'GOLD', currency: 'USD', price: Math.round(((base * 0.90) / 85) * 100) / 100 },
    ];

    for (const tp of tierPricing) {
      await prisma.priceListEntry.upsert({
        where: {
          productId_customerTier_currency: {
            productId: product.id,
            customerTier: tp.customerTier,
            currency: tp.currency,
          },
        },
        update: { price: tp.price },
        create: {
          productId: product.id,
          customerTier: tp.customerTier,
          currency: tp.currency,
          price: tp.price,
        },
      });
    }
  }

  console.log('✅ Successfully seeded Product Variants and Tier/Currency Price Lists!');
}

seedVariantsAndPriceLists()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
