import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@pos-checkout/shared';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersRepository, OrderRecord } from './orders.repository';
import { CustomersService } from '../customers/customers.service';
import { LocationsRepository } from '../locations/locations.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryService: InventoryService,
    private readonly customersService: CustomersService,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string, tenantId: string, userLocationId?: string): Promise<OrderRecord> {
    const existingOrder = await this.ordersRepository.findByUuid(createOrderDto.uuid);

    if (existingOrder) {
      return existingOrder;
    }

    // Resolve locationId: use provided, then user's locationId, then first location for tenant
    let locationId = createOrderDto.locationId || userLocationId;
    if (!locationId) {
      const locations = await this.locationsRepository.findByTenant(tenantId);
      if (locations.length === 0) {
        // If no locations exist, use tenantId as fallback (for single-location businesses)
        locationId = tenantId;
      } else {
        locationId = locations[0].id;
      }
    }

    const orderNumber = await this.generateOrderNumber(locationId);
    
    // If order is held, don't decrement inventory yet
    if (!createOrderDto.isHeld) {
      await this.validateAndDecrementInventory({ ...createOrderDto, locationId });
    }

    const order = await this.ordersRepository.create({
      ...createOrderDto,
      locationId,
      orderNumber,
      status: createOrderDto.isHeld ? OrderStatus.PENDING : OrderStatus.COMPLETED,
      createdBy: userId,
      synced: true,
      discountCents: createOrderDto.discountCents ?? 0,
      isHeld: createOrderDto.isHeld ?? false,
      heldAt: createOrderDto.isHeld ? new Date() : undefined,
    });

    // Award loyalty points if order is completed and has a customer
    if (!createOrderDto.isHeld && order.status === OrderStatus.COMPLETED && createOrderDto.customerId) {
      await this.awardLoyaltyPoints(createOrderDto.customerId, tenantId, order.totalCents, order.id);
    }

    return order;
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
    // Use first 4 chars of locationId, or 'DEFT' if locationId is too short (e.g., tenantId fallback)
    const locationPrefix = locationId.length >= 4 ? locationId.substring(0, 4).toUpperCase() : 'DEFT';
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

  async findHeldOrders(locationId?: string): Promise<OrderRecord[]> {
    return this.ordersRepository.findHeldOrders(locationId);
  }

  async holdOrder(id: string): Promise<OrderRecord> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Cannot hold a completed order');
    }
    return this.ordersRepository.update(id, {
      isHeld: true,
      heldAt: new Date(),
      status: OrderStatus.PENDING,
    });
  }

  async recallOrder(id: string): Promise<OrderRecord> {
    const order = await this.findOne(id);
    if (!order.isHeld) {
      throw new Error('Order is not held');
    }
    return this.ordersRepository.update(id, {
      isHeld: false,
      heldAt: undefined,
    });
  }

  async completeHeldOrder(id: string, tenantId: string): Promise<OrderRecord> {
    const order = await this.findOne(id);
    if (!order.isHeld) {
      throw new Error('Order is not held');
    }
    
    // Now decrement inventory
    await this.validateAndDecrementInventory({
      uuid: order.uuid,
      locationId: order.locationId,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        priceCents: item.priceCents,
        taxCents: item.taxCents,
        discountCents: item.discountCents,
      })),
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
    });

    const completedOrder = await this.ordersRepository.update(id, {
      isHeld: false,
      heldAt: undefined,
      status: OrderStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Award loyalty points if order has a customer
    if (completedOrder.customerId) {
      await this.awardLoyaltyPoints(completedOrder.customerId, tenantId, completedOrder.totalCents, completedOrder.id);
    }

    return completedOrder;
  }

  /**
   * Award loyalty points to a customer based on order total
   * Default rate: 1 point per 100 cents (1 point per NGN 1.00)
   * This can be configured per tenant in the future
   */
  private async awardLoyaltyPoints(
    customerId: string,
    tenantId: string,
    totalCents: number,
    orderId?: string,
  ): Promise<void> {
    try {
      // Points earning rate: 1 point per 100 cents (configurable in future)
      const POINTS_PER_100_CENTS = 1;
      const pointsEarned = Math.floor((totalCents / 100) * POINTS_PER_100_CENTS);

      if (pointsEarned > 0) {
        await this.customersService.addLoyaltyPoints(
          customerId,
          tenantId,
          pointsEarned,
          orderId,
          'Points earned from purchase',
        );
      }
    } catch (error) {
      // Log error but don't fail the order creation
      console.error(`Failed to award loyalty points to customer ${customerId}:`, error);
    }
  }
}

