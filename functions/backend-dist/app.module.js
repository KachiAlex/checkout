"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const locations_module_1 = require("./locations/locations.module");
const products_module_1 = require("./products/products.module");
const inventory_module_1 = require("./inventory/inventory.module");
const orders_module_1 = require("./orders/orders.module");
const payments_module_1 = require("./payments/payments.module");
const sync_module_1 = require("./sync/sync.module");
const reports_module_1 = require("./reports/reports.module");
const health_module_1 = require("./health/health.module");
const receipts_module_1 = require("./receipts/receipts.module");
const devices_module_1 = require("./devices/devices.module");
const tenants_module_1 = require("./tenants/tenants.module");
const firestore_module_1 = require("./firestore/firestore.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            firestore_module_1.FirestoreModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            locations_module_1.LocationsModule,
            products_module_1.ProductsModule,
            inventory_module_1.InventoryModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            sync_module_1.SyncModule,
            reports_module_1.ReportsModule,
            health_module_1.HealthModule,
            receipts_module_1.ReceiptsModule,
            devices_module_1.DevicesModule,
            tenants_module_1.TenantsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map