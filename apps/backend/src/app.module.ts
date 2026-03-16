import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import * as fs from 'fs';
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
import { DatabaseModule } from './database/database.module';
import { PlatformModule } from './platform/platform.module';
import { SubscriptionPricingModule } from './subscription-pricing/subscription-pricing.module';
import { ContactModule } from './contact/contact.module';
import { AccountingModule } from './accounting/accounting.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AuditModule } from './audit/audit.module';
import { LicensingModule } from './licensing/licensing.module';
import { BackupModule } from './backup/backup.module';

const isDesktopMode = process.env.DESKTOP_MODE === 'true';

const findEnvFile = (fileName: string): string | null => {
  let currentDir = process.cwd();
  const visited = new Set<string>();

  while (!visited.has(currentDir)) {
    visited.add(currentDir);
    const candidate = path.join(currentDir, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  return null;
};

const candidateEnvFiles = isDesktopMode ? ['.env.desktop', '.env'] : ['.env'];
const envFiles = candidateEnvFiles
  .map((fileName) => findEnvFile(fileName))
  .filter((value): value is string => Boolean(value));

if (envFiles.length === 0) {
  envFiles.push(path.join(process.cwd(), '.env'));
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFiles,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute (increased to fix 429 errors on reports page)
      },
    ]),
    ...(isDesktopMode ? [] : [FirestoreModule]),
    DatabaseModule,
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
    SubscriptionPricingModule,
    ContactModule,
    AccountingModule,
    ExpensesModule,
    AuditModule,
    LicensingModule,
    BackupModule,
  ],
  providers: [],
})
export class AppModule {}
