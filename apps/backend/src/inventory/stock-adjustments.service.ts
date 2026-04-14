import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export class StockAdjustmentDto {
  productId: string;
  locationId: string;
  delta: number;
  reason: string;
  notes?: string;
  adjustmentType: 'WASTE' | 'SPOILAGE' | 'MANUAL' | 'RETURN';
}

@Injectable()
export class StockAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAdjustment(tenantId: string, data: StockAdjustmentDto, userId: string) {
    // Verify product exists and belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: data.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify location exists and belongs to tenant
    const location = await this.prisma.location.findFirst({
      where: { id: data.locationId, tenantId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Get current stock
    const inventory = await this.prisma.inventory.findFirst({
      where: { productId: data.productId, locationId: data.locationId },
    });
    if (!inventory) {
      throw new NotFoundException('Inventory record not found for this product at this location');
    }

    const newQuantity = inventory.quantity + data.delta;
    if (newQuantity < 0) {
      throw new BadRequestException('Adjustment would result in negative stock');
    }

    // Update inventory
    await this.prisma.inventory.update({
      where: { id: inventory.id },
      data: { quantity: newQuantity },
    });

    // TODO: Create inventory transaction record when model exists
    // await this.prisma.inventoryTransaction.create({
    //   data: {
    //     tenantId,
    //     productId: data.productId,
    //     locationId: data.locationId,
    //     delta: data.delta,
    //     type: data.adjustmentType,
    //     reason: data.reason,
    //     notes: data.notes,
    //     userId,
    //   },
    // });

    return { success: true, newQuantity };
  }

  async getAdjustmentHistory(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;

    // TODO: Return adjustment history when inventoryTransaction model exists
    // return this.prisma.inventoryTransaction.findMany({
    //   where,
    //   include: {
    //     product: { select: { id: true, name: true, sku: true } },
    //     location: { select: { id: true, name: true } },
    //     user: { select: { id: true, name: true } },
    //   },
    //   orderBy: { createdAt: 'desc' },
    // });
    return [];
  }
}
