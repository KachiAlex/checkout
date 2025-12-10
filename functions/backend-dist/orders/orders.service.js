"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@pos-checkout/shared");
const inventory_service_1 = require("../inventory/inventory.service");
const orders_repository_1 = require("./orders.repository");
const customers_service_1 = require("../customers/customers.service");
const locations_repository_1 = require("../locations/locations.repository");
const users_repository_1 = require("../users/users.repository");
const products_service_1 = require("../products/products.service");
let OrdersService = class OrdersService {
    constructor(ordersRepository, inventoryService, customersService, locationsRepository, usersRepository, productsService) {
        this.ordersRepository = ordersRepository;
        this.inventoryService = inventoryService;
        this.customersService = customersService;
        this.locationsRepository = locationsRepository;
        this.usersRepository = usersRepository;
        this.productsService = productsService;
    }
    async create(createOrderDto, userId, tenantId, userLocationId) {
        const existingOrder = await this.ordersRepository.findByUuid(createOrderDto.uuid);
        if (existingOrder) {
            return existingOrder;
        }
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
                locationId = tenantId;
            }
            else {
                locationId = locations[0].id;
            }
        }
        if (!locationId) {
            throw new common_1.BadRequestException('Location ID is required. Please ensure you have a location assigned or create a location first.');
        }
        await this.validateOrderPrices(createOrderDto, locationId, tenantId);
        const orderNumber = await this.generateOrderNumber(locationId);
        const isCreditOrder = createOrderDto.isCreditOrder ?? false;
        if (!createOrderDto.isHeld) {
            await this.validateAndDecrementInventory({ ...createOrderDto, locationId }, userId, isCreditOrder);
        }
        const order = await this.ordersRepository.create({
            ...createOrderDto,
            locationId,
            tenantId,
            orderNumber,
            status: createOrderDto.isHeld ? shared_1.OrderStatus.PENDING : shared_1.OrderStatus.COMPLETED,
            createdBy: userId,
            synced: true,
            discountCents: createOrderDto.discountCents ?? 0,
            isHeld: createOrderDto.isHeld ?? false,
            heldAt: createOrderDto.isHeld ? new Date() : undefined,
            isCreditOrder,
            paymentStatus: isCreditOrder ? shared_1.PaymentStatus.PENDING : undefined,
        });
        console.log(`✅ Order created and saved: ${order.id} (${order.orderNumber}) for tenant ${tenantId}, status: ${order.status}, locationId: ${locationId}, createdAt: ${order.createdAt.toISOString()}`);
        if (!createOrderDto.isHeld && order.status === shared_1.OrderStatus.COMPLETED && createOrderDto.customerId) {
            await this.awardLoyaltyPoints(createOrderDto.customerId, tenantId, order.totalCents, order.id);
        }
        return order;
    }
    async findOne(id) {
        const order = await this.ordersRepository.findById(id);
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${id} not found`);
        }
        return order;
    }
    async findByUuid(uuid) {
        return this.ordersRepository.findByUuid(uuid);
    }
    async validateOrderPrices(dto, locationId, tenantId) {
        for (const item of dto.items) {
            const product = await this.productsService.findOne(item.productId, tenantId);
            const inventoryRecord = await this.inventoryService.getInventoryRecord(item.productId, locationId);
            const expectedPriceCents = inventoryRecord?.salesPriceCents ?? product.priceCents;
            const priceDifference = Math.abs(item.priceCents - expectedPriceCents);
            if (priceDifference > 1) {
                console.warn(`Price mismatch for product ${item.productId}: expected ${expectedPriceCents}, got ${item.priceCents}. Order UUID: ${dto.uuid}`);
            }
        }
    }
    async validateAndDecrementInventory(dto, userId, isCreditOrder = false) {
        for (const item of dto.items) {
            const stock = await this.inventoryService.getStockByProduct(item.productId, dto.locationId);
            if (stock < item.quantity) {
                throw new common_1.ConflictException(`Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`);
            }
            if (isCreditOrder) {
                await this.inventoryService.decrementForCreditSale(item.productId, dto.locationId, item.quantity, dto.uuid, userId);
            }
            else {
                await this.inventoryService.decrementForSale(item.productId, dto.locationId, item.quantity, dto.uuid, userId);
            }
        }
    }
    async generateOrderNumber(locationId) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const locationPrefix = locationId.length >= 4 ? locationId.substring(0, 4).toUpperCase() : 'DEFT';
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const ordersToday = await this.ordersRepository.list({
            locationId,
            from: startOfDay,
            to: new Date(),
        });
        return `ORD-${locationPrefix}-${dateStr}-${String(ordersToday.length + 1).padStart(6, '0')}`;
    }
    async update(id, updateDto) {
        const order = await this.findOne(id);
        return this.ordersRepository.update(id, {
            status: updateDto.status ? updateDto.status : order.status,
            notes: updateDto.notes ?? order.notes,
        });
    }
    async findAll(locationId, from, to, status, tenantId) {
        let filteredLocationId = locationId;
        if (tenantId && !locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            const locationIds = locations.map(loc => loc.id);
        }
        const orders = await this.ordersRepository.list({
            locationId: filteredLocationId,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            status: status ? status : undefined,
        });
        if (tenantId && !locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            const locationIds = new Set(locations.map(loc => loc.id));
            return orders.filter(order => locationIds.has(order.locationId));
        }
        return orders;
    }
    async findHeldOrders(locationId, tenantId) {
        const orders = await this.ordersRepository.findHeldOrders(locationId);
        if (tenantId && !locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            const locationIds = new Set(locations.map(loc => loc.id));
            return orders.filter(order => locationIds.has(order.locationId));
        }
        return orders;
    }
    async holdOrder(id) {
        const order = await this.findOne(id);
        if (order.status === shared_1.OrderStatus.COMPLETED) {
            throw new Error('Cannot hold a completed order');
        }
        return this.ordersRepository.update(id, {
            isHeld: true,
            heldAt: new Date(),
            status: shared_1.OrderStatus.PENDING,
        });
    }
    async recallOrder(id) {
        const order = await this.findOne(id);
        if (!order.isHeld) {
            throw new Error('Order is not held');
        }
        return this.ordersRepository.update(id, {
            isHeld: false,
            heldAt: undefined,
        });
    }
    async verifyTenantAccess(order, tenantId) {
        const location = await this.locationsRepository.findById(order.locationId);
        if (!location) {
            return false;
        }
        return location.tenantId === tenantId;
    }
    async verifyLocationAccess(locationId, tenantId) {
        const location = await this.locationsRepository.findById(locationId);
        if (!location) {
            throw new common_1.NotFoundException(`Location with ID ${locationId} not found`);
        }
        if (location.tenantId !== tenantId) {
            throw new common_1.ForbiddenException('Access denied to this location');
        }
    }
    async completeHeldOrder(id, tenantId) {
        const order = await this.findOne(id);
        if (!order.isHeld) {
            throw new Error('Order is not held');
        }
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
        }, order.createdBy, order.isCreditOrder ?? false);
        const completedOrder = await this.ordersRepository.update(id, {
            isHeld: false,
            heldAt: undefined,
            status: shared_1.OrderStatus.COMPLETED,
            completedAt: new Date(),
        });
        if (completedOrder.customerId) {
            await this.awardLoyaltyPoints(completedOrder.customerId, tenantId, completedOrder.totalCents, completedOrder.id);
        }
        return completedOrder;
    }
    async awardLoyaltyPoints(customerId, tenantId, totalCents, orderId) {
        try {
            const POINTS_PER_100_CENTS = 1;
            const pointsEarned = Math.floor((totalCents / 100) * POINTS_PER_100_CENTS);
            if (pointsEarned > 0) {
                await this.customersService.addLoyaltyPoints(customerId, tenantId, pointsEarned, orderId, 'Points earned from purchase');
            }
        }
        catch (error) {
            console.error(`Failed to award loyalty points to customer ${customerId}:`, error);
        }
    }
    async findCreditOrders(locationId, tenantId) {
        const orders = await this.ordersRepository.list({
            locationId,
            tenantId,
            isCreditOrder: true,
        });
        if (tenantId && !locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            const locationIds = new Set(locations.map(loc => loc.id));
            return orders.filter(order => locationIds.has(order.locationId));
        }
        return orders;
    }
    async markCreditOrderAsPaid(orderId, userId, tenantId) {
        const order = await this.findOne(orderId);
        const hasAccess = await this.verifyTenantAccess(order, tenantId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied to this order');
        }
        if (!order.isCreditOrder) {
            throw new common_1.BadRequestException('Order is not a credit order');
        }
        if (order.paymentStatus === shared_1.PaymentStatus.COMPLETED) {
            throw new common_1.BadRequestException('Credit order is already marked as paid');
        }
        if (order.paymentStatus === shared_1.PaymentStatus.REFUNDED) {
            throw new common_1.BadRequestException('Cannot mark returned credit order as paid');
        }
        return this.ordersRepository.update(orderId, {
            paymentStatus: shared_1.PaymentStatus.COMPLETED,
            paidAt: new Date(),
        });
    }
    async markCreditOrderAsReturned(orderId, userId, tenantId) {
        const order = await this.findOne(orderId);
        const hasAccess = await this.verifyTenantAccess(order, tenantId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied to this order');
        }
        if (!order.isCreditOrder) {
            throw new common_1.BadRequestException('Order is not a credit order');
        }
        if (order.paymentStatus === shared_1.PaymentStatus.REFUNDED) {
            throw new common_1.BadRequestException('Credit order is already marked as returned');
        }
        for (const item of order.items) {
            await this.inventoryService.incrementForReturn(item.productId, order.locationId, item.quantity, order.id, userId);
        }
        return this.ordersRepository.update(orderId, {
            paymentStatus: shared_1.PaymentStatus.REFUNDED,
            returnedAt: new Date(),
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        inventory_service_1.InventoryService,
        customers_service_1.CustomersService,
        locations_repository_1.LocationsRepository,
        users_repository_1.UsersRepository,
        products_service_1.ProductsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map