import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InventoryReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async stockOnHand(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;

    const inventory = await this.prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unitOfMeasure: true,
            category: true,
          },
        },
      },
    });

    return inventory.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      unitOfMeasure: item.product.unitOfMeasure,
      category: item.product.category,
      quantity: item.quantity,
      valueCents: item.quantity * (item.salesPriceCents || 0),
    }));
  }

  async costAndMargin(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;

    const inventory = await this.prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            priceCents: true,
            costCents: true,
            unitOfMeasure: true,
            category: true,
          },
        },
      },
    });

    return inventory.map((item) => {
      const unitCost = item.costCents || item.product.costCents || 0;
      const unitPrice = item.salesPriceCents || item.product.priceCents || 0;
      const marginCents = unitPrice - unitCost;
      const marginPercent = unitPrice > 0 ? (marginCents / unitPrice) * 100 : 0;

      return {
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        unitOfMeasure: item.product.unitOfMeasure,
        category: item.product.category,
        quantity: item.quantity,
        unitCost,
        unitPrice,
        marginCents,
        marginPercent,
        totalValue: item.quantity * unitPrice,
        totalCost: item.quantity * unitCost,
        totalMargin: item.quantity * marginCents,
      };
    });
  }

  async varianceReport(tenantId: string, locationId?: string) {
    // TODO: Implement variance report when inventoryTransaction model exists
    return [];
  }
}
