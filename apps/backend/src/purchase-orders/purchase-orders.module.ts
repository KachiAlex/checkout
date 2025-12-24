import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersRepository } from './purchase-orders.repository';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { TenantsModule } from '../tenants/tenants.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [SuppliersModule, TenantsModule, LocationsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PurchaseOrdersRepository],
  exports: [PurchaseOrdersService, PurchaseOrdersRepository],
})
export class PurchaseOrdersModule {}
