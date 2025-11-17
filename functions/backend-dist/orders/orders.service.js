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
let OrdersService = class OrdersService {
    constructor(ordersRepository, inventoryService, customersService, locationsRepository) {
        this.ordersRepository = ordersRepository;
        this.inventoryService = inventoryService;
        this.customersService = customersService;
        this.locationsRepository = locationsRepository;
    }
    async create(createOrderDto, userId, tenantId, userLocationId) {
        const existingOrder = await this.ordersRepository.findByUuid(createOrderDto.uuid);
        if (existingOrder) {
            return existingOrder;
        }
        let locationId = createOrderDto.locationId || userLocationId;
        if (!locationId) {
            const locations = await this.locationsRepository.findByTenant(tenantId);
            if (locations.length === 0) {
                locationId = tenantId;
            }
            else {
                locationId = locations[0].id;
            }
        }
        const orderNumber = await this.generateOrderNumber(locationId);
        if (!createOrderDto.isHeld) {
            await this.validateAndDecrementInventory({ ...createOrderDto, locationId });
        }
        const order = await this.ordersRepository.create({
            ...createOrderDto,
            locationId,
            orderNumber,
            status: createOrderDto.isHeld ? shared_1.OrderStatus.PENDING : shared_1.OrderStatus.COMPLETED,
            createdBy: userId,
            synced: true,
            discountCents: createOrderDto.discountCents ?? 0,
            isHeld: createOrderDto.isHeld ?? false,
            heldAt: createOrderDto.isHeld ? new Date() : undefined,
        });
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
    async validateAndDecrementInventory(dto) {
        for (const item of dto.items) {
            const stock = await this.inventoryService.getStockByProduct(item.productId, dto.locationId);
            if (stock < item.quantity) {
                throw new common_1.ConflictException(`Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`);
            }
            await this.inventoryService.decrementForSale(item.productId, dto.locationId, item.quantity, dto.uuid);
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
    async findAll(locationId, from, to, status) {
        return this.ordersRepository.list({
            locationId,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            status: status ? status : undefined,
        });
    }
    async findHeldOrders(locationId) {
        return this.ordersRepository.findHeldOrders(locationId);
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
        });
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
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        inventory_service_1.InventoryService,
        customers_service_1.CustomersService,
        locations_repository_1.LocationsRepository])
], OrdersService);
//# sourceMappingURL=orders.service.js.map