import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { SyncModule } from './sync/sync.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { DevicesModule } from './devices/devices.module';
import { TenantsModule } from './tenants/tenants.module';
import { FirestoreModule } from './firestore/firestore.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { GRNModule } from './grn/grn.module';
import { CustomersModule } from './customers/customers.module';
import { ReturnsModule } from './returns/returns.module';
import { PaymentSettingsModule } from './payment-settings/payment-settings.module';
import { TaxSettingsModule } from './tax-settings/tax-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute (default)
      },
    ]),
    FirestoreModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    PaymentsModule,
    SyncModule,
    ReportsModule,
    HealthModule,
    ReceiptsModule,
    DevicesModule,
    TenantsModule,
    CategoriesModule,
    BrandsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    GRNModule,
    CustomersModule,
    ReturnsModule,
    PaymentSettingsModule,
    TaxSettingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
