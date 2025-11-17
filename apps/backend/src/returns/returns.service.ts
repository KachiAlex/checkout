import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReturnsRepository, ReturnRecord, ReturnStatus, CreateReturnInput } from './returns.repository';
import { CreateReturnDto } from './dto/create-return.dto';
import { OrdersService } from '../orders/orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '@pos-checkout/shared';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly returnsRepository: ReturnsRepository,
    private readonly ordersService: OrdersService,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async create(createReturnDto: CreateReturnDto, userId: string, locationId: string): Promise<ReturnRecord> {
    // Verify order exists
    const order = await this.ordersService.findOne(createReturnDto.orderId);
    
    if (!order) {
      throw new NotFoundException(`Order ${createReturnDto.orderId} not found`);
    }

    // Validate return items exist in order
    for (const returnItem of createReturnDto.items) {
      const orderItem = order.items.find(item => item.productId === returnItem.productId);
      if (!orderItem) {
        throw new BadRequestException(`Product ${returnItem.productId} not found in order`);
      }
      if (returnItem.quantity > orderItem.quantity) {
        throw new BadRequestException(`Return quantity (${returnItem.quantity}) exceeds ordered quantity (${orderItem.quantity})`);
      }
    }

    // Create return record
    const returnRecord = await this.returnsRepository.create({
      orderId: order.id,
      orderNumber: order.orderNumber,
      locationId,
      customerId: order.customerId,
      items: createReturnDto.items,
      totalRefundCents: createReturnDto.totalRefundCents,
      reason: createReturnDto.reason,
      notes: createReturnDto.notes,
      processedBy: userId,
    });

    return returnRecord;
  }

  async approve(returnId: string, userId: string): Promise<ReturnRecord> {
    const returnRecord = await this.returnsRepository.findById(returnId);
    
    if (!returnRecord) {
      throw new NotFoundException(`Return ${returnId} not found`);
    }

    if (returnRecord.status !== ReturnStatus.PENDING) {
      throw new BadRequestException(`Return is already ${returnRecord.status}`);
    }

    // Restore inventory
    for (const item of returnRecord.items) {
      await this.inventoryService.incrementForReturn(
        item.productId,
        returnRecord.locationId,
        item.quantity,
        returnRecord.id,
      );
    }

    // Process refund
    const orderPayments = await this.paymentsService.getOrderPayments(returnRecord.orderId);
    if (orderPayments.length > 0) {
      // Refund the first completed payment (or implement more sophisticated refund logic)
      const completedPayment = orderPayments.find(p => p.status === PaymentStatus.COMPLETED);
      if (completedPayment) {
        await this.paymentsService.refund(completedPayment.id, returnRecord.totalRefundCents);
      }
    }

    // Update return status
    return this.returnsRepository.update(returnId, {
      status: ReturnStatus.APPROVED,
      processedBy: userId,
      processedAt: new Date(),
    });
  }

  async reject(returnId: string, userId: string, reason?: string): Promise<ReturnRecord> {
    const returnRecord = await this.returnsRepository.findById(returnId);
    
    if (!returnRecord) {
      throw new NotFoundException(`Return ${returnId} not found`);
    }

    if (returnRecord.status !== ReturnStatus.PENDING) {
      throw new BadRequestException(`Return is already ${returnRecord.status}`);
    }

    return this.returnsRepository.update(returnId, {
      status: ReturnStatus.REJECTED,
      processedBy: userId,
      processedAt: new Date(),
      notes: reason ? `${returnRecord.notes || ''}\nRejection reason: ${reason}`.trim() : returnRecord.notes,
    });
  }

  async complete(returnId: string, userId: string): Promise<ReturnRecord> {
    const returnRecord = await this.returnsRepository.findById(returnId);
    
    if (!returnRecord) {
      throw new NotFoundException(`Return ${returnId} not found`);
    }

    if (returnRecord.status !== ReturnStatus.APPROVED) {
      throw new BadRequestException(`Return must be APPROVED before completion. Current status: ${returnRecord.status}`);
    }

    return this.returnsRepository.update(returnId, {
      status: ReturnStatus.COMPLETED,
      processedBy: userId,
      processedAt: new Date(),
    });
  }

  async findOne(id: string): Promise<ReturnRecord> {
    const returnRecord = await this.returnsRepository.findById(id);
    if (!returnRecord) {
      throw new NotFoundException(`Return with ID ${id} not found`);
    }
    return returnRecord;
  }

  async findByOrderId(orderId: string): Promise<ReturnRecord[]> {
    return this.returnsRepository.findByOrderId(orderId);
  }

  async findByReturnNumber(returnNumber: string): Promise<ReturnRecord | null> {
    return this.returnsRepository.findByReturnNumber(returnNumber);
  }

  async findAll(locationId?: string, from?: string, to?: string, status?: ReturnStatus) {
    return this.returnsRepository.list({
      locationId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status,
    });
  }
}

