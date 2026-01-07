import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingRepository } from './accounting.repository';
import { TaxEngineService } from './tax-engine.service';
import { AccountingController } from './accounting.controller';
import { AdminAccountingController } from './admin-accounting.controller';
import { AccountingReportsService } from './accounting-reports.service';
import { AdminAccountingReportsController } from './admin-accounting-reports.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountingController, AdminAccountingController, AdminAccountingReportsController],
  providers: [AccountingService, AccountingRepository, TaxEngineService, AccountingReportsService],
  exports: [AccountingService, AccountingRepository, TaxEngineService, AccountingReportsService],
})
export class AccountingModule {}
