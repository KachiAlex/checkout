import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersRepository } from './orders.repository';
import { CustomersModule } from '../customers/customers.module';
import { LocationsModule } from '../locations/locations.module';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { AccountingModule } from '../accounting/accounting.module';
import { RecipesModule } from '../recipes/recipes.module';

@Module({
  imports: [
    InventoryModule,
    CustomersModule,
    LocationsModule,
    UsersModule,
    ProductsModule,
    AccountingModule,
    RecipesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
