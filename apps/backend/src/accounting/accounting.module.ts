import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingRepository } from './accounting.repository';
import { TaxEngineService } from './tax-engine.service';
import { AccountingController } from './accounting.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingRepository, TaxEngineService],
  exports: [AccountingService, AccountingRepository, TaxEngineService],
})
export class AccountingModule {}
