import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
// import { UsersModule } from './users/users.module'; // Temporarily disabled due to decorator compatibility issues
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
// import { CategoriesModule } from './categories/categories.module'; // Temporarily disabled due to decorator compatibility issues
// import { BrandsModule } from './brands/brands.module'; // Temporarily disabled due to decorator compatibility issues
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { GRNModule } from './grn/grn.module';
// import { CustomersModule } from './customers/customers.module'; // Temporarily disabled due to decorator compatibility issues
import { ReturnsModule } from './returns/returns.module';
import { PaymentSettingsModule } from './payment-settings/payment-settings.module';
import { TaxSettingsModule } from './tax-settings/tax-settings.module';
// import { CustomizationModule } from './customization/customization.module'; // Temporarily disabled due to decorator compatibility issues
import { UploadModule } from './upload/upload.module';
import { PlatformModule } from './platform/platform.module';
// import { SubscriptionPricingModule } from './subscription-pricing/subscription-pricing.module'; // Temporarily disabled due to decorator compatibility issues
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute (increased to fix 429 errors on reports page)
      },
    ]),
    FirestoreModule,
    AuthModule,
    // UsersModule, // Temporarily disabled due to decorator compatibility issues
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
    PlatformModule,
    // CategoriesModule, // Temporarily disabled due to decorator compatibility issues
    // BrandsModule, // Temporarily disabled due to decorator compatibility issues
    SuppliersModule,
    PurchaseOrdersModule,
    GRNModule,
    // CustomersModule, // Temporarily disabled due to decorator compatibility issues
    ReturnsModule,
    PaymentSettingsModule,
    TaxSettingsModule,
    // CustomizationModule, // Temporarily disabled due to decorator compatibility issues
    UploadModule,
    // SubscriptionPricingModule, // Temporarily disabled due to decorator compatibility issues
    ContactModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
