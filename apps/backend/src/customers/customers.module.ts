import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';
import { LoyaltyTransactionsRepository } from './loyalty-transactions.repository';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository, LoyaltyTransactionsRepository],
  exports: [CustomersService, CustomersRepository, LoyaltyTransactionsRepository],
})
export class CustomersModule {}
