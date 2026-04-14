import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { StockAdjustmentsController } from './stock-adjustments.controller';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { InventoryReportsController } from './inventory-reports.controller';
import { InventoryReportsService } from './inventory-reports.service';
import { ProductsModule } from '../products/products.module';
import { LocationsRepository } from '../locations/locations.repository';
import { CategoriesModule } from '../categories/categories.module';
import { BrandsModule } from '../brands/brands.module';
import { BatchInventoryRepository } from './batch-inventory.repository';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [ProductsModule, CategoriesModule, BrandsModule, UsersModule, TenantsModule],
  controllers: [InventoryController, StockAdjustmentsController, InventoryReportsController],
  providers: [InventoryService, InventoryRepository, LocationsRepository, BatchInventoryRepository, StockAdjustmentsService, InventoryReportsService],
  exports: [InventoryService, InventoryRepository, BatchInventoryRepository, StockAdjustmentsService, InventoryReportsService],
})
export class InventoryModule {}
