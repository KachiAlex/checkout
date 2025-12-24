import { Module } from '@nestjs/common';
import { GRNController } from './grn.controller';
import { GRNService } from './grn.service';
import { GRNRepository } from './grn.repository';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { BatchInventoryRepository } from '../inventory/batch-inventory.repository';
import { TenantsModule } from '../tenants/tenants.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [PurchaseOrdersModule, InventoryModule, TenantsModule, LocationsModule],
  controllers: [GRNController],
  providers: [GRNService, GRNRepository, BatchInventoryRepository],
  exports: [GRNService, GRNRepository],
})
export class GRNModule {}
