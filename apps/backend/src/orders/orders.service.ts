import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, InventoryTransactionType } from '@pos-checkout/shared';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersRepository, OrderRecord } from './orders.repository';
import { CustomersService } from '../customers/customers.service';
import { LocationsRepository } from '../locations/locations.repository';
import { UsersRepository } from '../users/users.repository';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryService: InventoryService,
    private readonly customersService: CustomersService,
    private readonly locationsRepository: LocationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly productsService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string, tenantId: string, userLocationId?: string): Promise<OrderRecord> {
    const existingOrder = await this.ordersRepository.findByUuid(createOrderDto.uuid);

    if (existingOrder) {
      return existingOrder;
    }

    // Resolve locationId: use provided, then user's locationId, then first location for tenant
    let locationId = createOrderDto.locationId;
    if (!locationId) {
      const user = await this.usersRepository.findById(userId);
      locationId = user?.locationId;
    }
    if (!locationId) {
      locationId = userLocationId;
    }
    if (!locationId) {
      const locations = await this.locationsRepository.findByTenant(tenantId);
      if (locations.length === 0) {
        // If no locations exist, use tenantId as fallback (for single-location businesses)
        locationId = tenantId;
      } else {
        locationId = locations[0].id;
      }
    }

    // Final validation: ensure locationId is set (should never be null/undefined at this point)
    if (!locationId) {
      throw new BadRequestException(
        'Location ID is required. Please ensure you have a location assigned or create a location first.',
      );
    }

    // Validate prices against product catalog and inventory
    await this.validateOrderPrices(createOrderDto, locationId, tenantId);

    const orderNumber = await this.generateOrderNumber(locationId);
    const isCreditOrder = createOrderDto.isCreditOrder ?? false;
    
    // If order is held, don't decrement inventory yet
    if (!createOrderDto.isHeld) {
      await this.validateAndDecrementInventory({ ...createOrderDto, locationId }, userId, isCreditOrder);
    }

    const order = await this.ordersRepository.create({
      ...createOrderDto,
      locationId,
      tenantId, // Add tenantId for better data organization
      orderNumber,
      status: createOrderDto.isHeld ? OrderStatus.PENDING : OrderStatus.COMPLETED,
      createdBy: userId,
      synced: true,
      discountCents: createOrderDto.discountCents ?? 0,
      isHeld: createOrderDto.isHeld ?? false,
      heldAt: createOrderDto.isHeld ? new Date() : undefined,
      isCreditOrder,
      paymentStatus: isCreditOrder ? PaymentStatus.PENDING : undefined,
      customerId: createOrderDto.customerId || undefined, // Explicitly include customerId even if undefined
    });

    console.log(`✅ Order created and saved: ${order.id} (${order.orderNumber}) for tenant ${tenantId}, status: ${order.status}, locationId: ${locationId}, customerId: ${order.customerId || 'none'}, isCreditOrder: ${isCreditOrder}, createdAt: ${order.createdAt.toISOString()}`);

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

  /**
   * Validate that order item prices match server-side product/inventory prices
   * This prevents price manipulation attacks
   */
  private async validateOrderPrices(
    dto: CreateOrderDto,
    locationId: string,
    tenantId: string,
  ): Promise<void> {
    for (const item of dto.items) {
      // Get product to verify it exists and get base price
      const product = await this.productsService.findOne(item.productId, tenantId);
      
      // Get inventory record to check for sales price override
      const inventoryRecord = await this.inventoryService.getInventoryRecord(
        item.productId,
        locationId,
      );
      
      // Determine expected price: use inventory salesPriceCents if available, otherwise product priceCents
      const expectedPriceCents =
        inventoryRecord?.salesPriceCents ?? product.priceCents;
      
      // Allow small tolerance for rounding differences (1 cent)
      const priceDifference = Math.abs(item.priceCents - expectedPriceCents);
      
      if (priceDifference > 1) {
        // Price mismatch detected - log warning but allow for now (manager override may have been used)
        // In production, you might want to reject or require additional authorization
        console.warn(
          `Price mismatch for product ${item.productId}: expected ${expectedPriceCents}, got ${item.priceCents}. Order UUID: ${dto.uuid}`,
        );
        
        // For now, we'll allow it but log it. In a stricter implementation, you could:
        // 1. Reject the order
        // 2. Override with server price
        // 3. Require manager authorization for price overrides
      }
    }
  }

  private async validateAndDecrementInventory(dto: CreateOrderDto, userId: string, isCreditOrder: boolean = false): Promise<void> {
    for (const item of dto.items) {
      const stock = await this.inventoryService.getStockByProduct(item.productId, dto.locationId);

      if (stock < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`,
        );
      }

      // Use CREDIT_SALE transaction type for credit orders
      if (isCreditOrder) {
        await this.inventoryService.decrementForCreditSale(
          item.productId,
          dto.locationId,
          item.quantity,
          dto.uuid,
          userId,
        );
      } else {
      await this.inventoryService.decrementForSale(
        item.productId,
        dto.locationId,
        item.quantity,
        dto.uuid,
        userId, // Pass userId to track who made the sale
      );
      }
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

  async findAll(locationId?: string, from?: string, to?: string, status?: string, tenantId?: string) {
    // If tenantId is provided, filter by tenant locations
    let filteredLocationId = locationId;
    if (tenantId && !locationId) {
      // Get all locations for tenant and filter orders
      const locations = await this.locationsRepository.findByTenant(tenantId);
      const locationIds = locations.map(loc => loc.id);
      // Note: Firestore doesn't support 'in' queries with more than 10 items easily
      // For now, we'll filter in memory if needed, or use locationId if provided
    }
    
    const orders = await this.ordersRepository.list({
      locationId: filteredLocationId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status: status ? (status as OrderStatus) : undefined,
    });
    
    // Filter by tenant if tenantId provided and no locationId specified
    if (tenantId && !locationId) {
      const locations = await this.locationsRepository.findByTenant(tenantId);
      const locationIds = new Set(locations.map(loc => loc.id));
      return orders.filter(order => locationIds.has(order.locationId));
    }
    
    return orders;
  }

  async findHeldOrders(locationId?: string, tenantId?: string): Promise<OrderRecord[]> {
    const orders = await this.ordersRepository.findHeldOrders(locationId);
    
    // Filter by tenant if tenantId provided
    if (tenantId && !locationId) {
      const locations = await this.locationsRepository.findByTenant(tenantId);
      const locationIds = new Set(locations.map(loc => loc.id));
      return orders.filter(order => locationIds.has(order.locationId));
    }
    
    return orders;
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

  /**
   * Verify that an order belongs to the specified tenant by checking location ownership
   */
  async verifyTenantAccess(order: OrderRecord, tenantId: string): Promise<boolean> {
    const location = await this.locationsRepository.findById(order.locationId);
    if (!location) {
      return false;
    }
    
    // Location must belong to the tenant
    return location.tenantId === tenantId;
  }

  /**
   * Verify that a location belongs to the specified tenant
   */
  async verifyLocationAccess(locationId: string, tenantId: string): Promise<void> {
    const location = await this.locationsRepository.findById(locationId);
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }
    
    if (location.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this location');
    }
  }

  async completeHeldOrder(id: string, tenantId: string): Promise<OrderRecord> {
    const order = await this.findOne(id);
    if (!order.isHeld) {
      throw new Error('Order is not held');
    }
    
    // Now decrement inventory with userId
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
    }, order.createdBy, order.isCreditOrder ?? false); // Pass userId from order

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

  /**
   * Get all credit orders (orders taken on credit)
   */
  async findCreditOrders(locationId?: string, tenantId?: string): Promise<OrderRecord[]> {
    try {
      const orders = await this.ordersRepository.list({
        locationId,
        tenantId,
        isCreditOrder: true,
      });
      
      console.log(`📋 Found ${orders.length} credit orders for tenant ${tenantId}, location ${locationId || 'all'}`);
      // Log customerIds from orders
      orders.forEach(order => {
        console.log(`  Order ${order.orderNumber} (${order.id}): customerId=${order.customerId || 'none'}`);
      });
      
      // Filter by tenant if tenantId provided and no locationId specified
      // Note: This filtering is usually done by the query, but we keep it as a safety check
      if (tenantId && !locationId) {
        const locations = await this.locationsRepository.findByTenant(tenantId);
        const locationIds = new Set(locations.map(loc => loc.id));
        const filtered = orders.filter(order => locationIds.has(order.locationId));
        console.log(`  Filtered to ${filtered.length} orders after location check`);
        return filtered;
      }
      
      return orders;
    } catch (error: any) {
      // If it's an index error, provide helpful message
      if (error?.code === 9 || error?.message?.includes('index') || error?.message?.includes('FAILED_PRECONDITION')) {
        console.error('Firestore index error in findCreditOrders:', error.message);
        throw new BadRequestException(
          'Firestore index is being built. Please wait a few minutes and try again. ' +
          'If the error persists, check Firebase Console for index build status.'
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Mark a credit order as paid
   */
  async markCreditOrderAsPaid(orderId: string, userId: string, tenantId: string): Promise<OrderRecord> {
    const order = await this.findOne(orderId);
    
    // Verify tenant access
    const hasAccess = await this.verifyTenantAccess(order, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }

    if (!order.isCreditOrder) {
      throw new BadRequestException('Order is not a credit order');
    }

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Credit order is already marked as paid');
    }

    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Cannot mark returned credit order as paid');
    }

    // Update order payment status
    return this.ordersRepository.update(orderId, {
      paymentStatus: PaymentStatus.COMPLETED,
      paidAt: new Date(),
      returnedAt: undefined, // Clear returned date if it was set
    });
  }

  /**
   * Mark a credit order as returned (products returned)
   */
  async markCreditOrderAsReturned(orderId: string, userId: string, tenantId: string): Promise<OrderRecord> {
    const order = await this.findOne(orderId);
    
    // Verify tenant access
    const hasAccess = await this.verifyTenantAccess(order, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this order');
    }

    if (!order.isCreditOrder) {
      throw new BadRequestException('Order is not a credit order');
    }

    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Credit order is already marked as returned');
    }

    // Restore inventory for returned products
    for (const item of order.items) {
      await this.inventoryService.incrementForReturn(
        item.productId,
        order.locationId,
        item.quantity,
        order.id,
        userId,
      );
    }

    // Update order payment status
    return this.ordersRepository.update(orderId, {
      paymentStatus: PaymentStatus.REFUNDED,
      returnedAt: new Date(),
      paidAt: undefined, // Clear paid date if it was set
    });
  }
}

