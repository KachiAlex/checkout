import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@pos-checkout/shared';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersRepository, OrderRecord } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<OrderRecord> {
    const existingOrder = await this.ordersRepository.findByUuid(createOrderDto.uuid);

    if (existingOrder) {
      return existingOrder;
    }

    const orderNumber = await this.generateOrderNumber(createOrderDto.locationId);
    await this.validateAndDecrementInventory(createOrderDto);

    return this.ordersRepository.create({
      ...createOrderDto,
      orderNumber,
      status: OrderStatus.COMPLETED,
      createdBy: userId,
      synced: true,
      discountCents: createOrderDto.discountCents ?? 0,
    });
  }

  async findOne(id: string): Promise<OrderRecord> {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByUuid(uuid: string): Promise<OrderRecord | null> {
    return this.ordersRepository.findByUuid(uuid);
  }

  private async validateAndDecrementInventory(dto: CreateOrderDto): Promise<void> {
    for (const item of dto.items) {
      const stock = await this.inventoryService.getStockByProduct(item.productId, dto.locationId);

      if (stock < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`,
        );
      }

      await this.inventoryService.decrementForSale(
        item.productId,
        dto.locationId,
        item.quantity,
        dto.uuid,
      );
    }
  }

  private async generateOrderNumber(locationId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const locationPrefix = locationId.substring(0, 4).toUpperCase();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const ordersToday = await this.ordersRepository.list({
      locationId,
      from: startOfDay,
      to: new Date(),
    });

    return `ORD-${locationPrefix}-${dateStr}-${String(ordersToday.length + 1).padStart(6, '0')}`;
  }

  async update(id: string, updateDto: { status?: string; notes?: string }): Promise<OrderRecord> {
    const order = await this.findOne(id);

    return this.ordersRepository.update(id, {
      status: updateDto.status ? (updateDto.status as OrderStatus) : order.status,
      notes: updateDto.notes ?? order.notes,
    });
  }

  async findAll(locationId?: string, from?: string, to?: string, status?: string) {
    return this.ordersRepository.list({
      locationId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status: status ? (status as OrderStatus) : undefined,
    });
  }
}

