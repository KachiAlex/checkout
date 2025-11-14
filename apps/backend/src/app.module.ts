import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
})
export class AppModule {}
