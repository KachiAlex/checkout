import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './expenses.repository';
import { AdminExpensesController } from './admin-expenses.controller';
import { DatabaseModule } from '../database/database.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [DatabaseModule, AccountingModule],
  controllers: [AdminExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  exports: [ExpensesService, ExpensesRepository],
})
export class ExpensesModule {}
