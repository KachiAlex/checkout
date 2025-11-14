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
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("../orders/orders.service");
const orders_repository_1 = require("../orders/orders.repository");
let SyncService = class SyncService {
    constructor(ordersService, ordersRepository) {
        this.ordersService = ordersService;
        this.ordersRepository = ordersRepository;
    }
    async pushChanges(dto) {
        let processed = 0;
        let failed = 0;
        for (const event of dto.events) {
            try {
                const existingOrder = await this.ordersRepository.findByUuid(event.id);
                if (existingOrder) {
                    processed++;
                    continue;
                }
                if (event.type === 'order.created') {
                    await this.processOrderEvent(event);
                    processed++;
                }
                else {
                    console.warn(`Unknown event type: ${event.type}`);
                    processed++;
                }
            }
            catch (error) {
                console.error(`Failed to process event ${event.id}:`, error);
                failed++;
            }
        }
        return { processed, failed };
    }
    async pullChanges(deviceId, since) {
        const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const orders = await this.ordersRepository.list({
            deviceId,
            from: sinceDate,
        });
        return orders.map((order) => ({
            id: order.uuid,
            type: 'order.created',
            payload: order,
            server_ts: order.createdAt.getTime(),
        }));
    }
    async processOrderEvent(event) {
        if (event.type === 'order.created' && event.payload.uuid) {
            console.log(`Processing order event: ${event.id}`);
        }
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        orders_repository_1.OrdersRepository])
], SyncService);
//# sourceMappingURL=sync.service.js.map