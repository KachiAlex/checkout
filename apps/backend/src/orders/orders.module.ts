import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersRepository } from './orders.repository';
import { CustomersModule } from '../customers/customers.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [InventoryModule, CustomersModule, LocationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
