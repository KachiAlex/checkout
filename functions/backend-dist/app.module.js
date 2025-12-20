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
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./auth/auth.module");
// import { UsersModule } from './users/users.module'; // Temporarily disabled due to decorator compatibility issues
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
// import { CategoriesModule } from './categories/categories.module'; // Temporarily disabled due to decorator compatibility issues
// import { BrandsModule } from './brands/brands.module'; // Temporarily disabled due to decorator compatibility issues
const suppliers_module_1 = require("./suppliers/suppliers.module");
const purchase_orders_module_1 = require("./purchase-orders/purchase-orders.module");
const grn_module_1 = require("./grn/grn.module");
// import { CustomersModule } from './customers/customers.module'; // Temporarily disabled due to decorator compatibility issues
const returns_module_1 = require("./returns/returns.module");
const payment_settings_module_1 = require("./payment-settings/payment-settings.module");
const tax_settings_module_1 = require("./tax-settings/tax-settings.module");
// import { CustomizationModule } from './customization/customization.module'; // Temporarily disabled due to decorator compatibility issues
const upload_module_1 = require("./upload/upload.module");
const database_module_1 = require("./database/database.module");
const platform_module_1 = require("./platform/platform.module");
const subscription_pricing_module_1 = require("./subscription-pricing/subscription-pricing.module");
const contact_module_1 = require("./contact/contact.module");
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
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000, // 1 minute
                    limit: 200, // 200 requests per minute (increased to fix 429 errors on reports page)
                },
            ]),
            firestore_module_1.FirestoreModule,
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            // UsersModule, // Temporarily disabled due to decorator compatibility issues
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
            platform_module_1.PlatformModule,
            // CategoriesModule, // Temporarily disabled due to decorator compatibility issues
            // BrandsModule, // Temporarily disabled due to decorator compatibility issues
            suppliers_module_1.SuppliersModule,
            purchase_orders_module_1.PurchaseOrdersModule,
            grn_module_1.GRNModule,
            // CustomersModule, // Temporarily disabled due to decorator compatibility issues
            returns_module_1.ReturnsModule,
            payment_settings_module_1.PaymentSettingsModule,
            tax_settings_module_1.TaxSettingsModule,
            // CustomizationModule, // Temporarily disabled due to decorator compatibility issues
            upload_module_1.UploadModule,
            subscription_pricing_module_1.SubscriptionPricingModule,
            contact_module_1.ContactModule,
        ],
        providers: [],
    })
], AppModule);
