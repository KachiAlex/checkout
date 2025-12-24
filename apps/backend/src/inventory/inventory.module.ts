import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ProductsModule } from '../products/products.module';
import { LocationsRepository } from '../locations/locations.repository';
import { CategoriesModule } from '../categories/categories.module';
import { BrandsModule } from '../brands/brands.module';
import { BatchInventoryRepository } from './batch-inventory.repository';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [ProductsModule, CategoriesModule, BrandsModule, UsersModule, TenantsModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, LocationsRepository, BatchInventoryRepository],
  exports: [InventoryService, InventoryRepository, BatchInventoryRepository],
})
export class InventoryModule {}
