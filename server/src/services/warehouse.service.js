import prisma from '../config/db.js';

/**
 * Computes the recommended warehouse split for an order.
 * 
 * Algorithm:
 * 1. For each product in the order, find warehouses with stock
 * 2. Sort by shippingCostWeight (ascending) — prefer cheapest
 * 3. Allocate from cheapest warehouse first, spill to next
 * 4. Track remaining as backorder if total stock < ordered qty
 */
export async function computeWarehouseSplit(quotationId) {
  const lines = await prisma.quotationLine.findMany({
    where: { quotationId },
    include: { product: true },
  });

  // Only physical products need warehouse fulfillment
  const physicalLines = lines.filter(l =>
    ['Hardware', 'Accessories'].includes(l.product.category)
  );

  if (physicalLines.length === 0) {
    return { splits: [], backorders: [], message: 'No physical products to fulfill' };
  }

  const warehouses = await prisma.warehouse.findMany({
    include: { stockLevels: true },
    orderBy: { shippingCostWeight: 'asc' },
  });

  const splits = [];
  const backorders = [];

  for (const line of physicalLines) {
    let remaining = line.quantity;

    for (const warehouse of warehouses) {
      if (remaining <= 0) break;

      const stock = warehouse.stockLevels.find(
        s => s.productId === line.productId
      );

      if (!stock || stock.quantity <= 0) continue;

      const allocate = Math.min(remaining, stock.quantity);

      splits.push({
        quotationId,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        productId: line.productId,
        productName: line.product.name,
        quantityFulfilled: allocate,
        shippingCostWeight: Number(warehouse.shippingCostWeight),
      });

      remaining -= allocate;
    }

    if (remaining > 0) {
      backorders.push({
        productId: line.productId,
        productName: line.product.name,
        quantityShort: remaining,
      });
    }
  }

  return { splits, backorders };
}

/**
 * Saves the warehouse split (recommended or manually overridden) to the database.
 */
export async function saveWarehouseSplit(quotationId, splits) {
  // Clear existing splits for this quotation
  await prisma.warehouseSplit.deleteMany({ where: { quotationId } });

  // Create new splits
  const records = splits.map(s => ({
    quotationId,
    warehouseId: s.warehouseId,
    productId: s.productId,
    quantityFulfilled: s.quantityFulfilled,
  }));

  await prisma.warehouseSplit.createMany({ data: records });

  // Deduct stock from warehouses
  for (const split of splits) {
    await prisma.stockLevel.updateMany({
      where: {
        warehouseId: split.warehouseId,
        productId: split.productId,
      },
      data: {
        quantity: { decrement: split.quantityFulfilled },
      },
    });
  }

  return records;
}

/**
 * Gets the current warehouse split for a quotation.
 */
export async function getWarehouseSplit(quotationId) {
  return prisma.warehouseSplit.findMany({
    where: { quotationId },
    include: {
      warehouse: true,
    },
  });
}
