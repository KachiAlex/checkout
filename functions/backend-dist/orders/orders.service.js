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
let OrdersService = class OrdersService {
    constructor(ordersRepository, inventoryService) {
        this.ordersRepository = ordersRepository;
        this.inventoryService = inventoryService;
    }
    async create(createOrderDto, userId) {
        const existingOrder = await this.ordersRepository.findByUuid(createOrderDto.uuid);
        if (existingOrder) {
            return existingOrder;
        }
        const orderNumber = await this.generateOrderNumber(createOrderDto.locationId);
        await this.validateAndDecrementInventory(createOrderDto);
        return this.ordersRepository.create({
            ...createOrderDto,
            orderNumber,
            status: shared_1.OrderStatus.COMPLETED,
            createdBy: userId,
            synced: true,
            discountCents: createOrderDto.discountCents ?? 0,
        });
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
        const locationPrefix = locationId.substring(0, 4).toUpperCase();
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
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        inventory_service_1.InventoryService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map