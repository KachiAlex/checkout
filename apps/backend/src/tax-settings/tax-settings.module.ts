import { Module } from '@nestjs/common';
import { TaxSettingsController } from './tax-settings.controller';
import { TaxSettingsService } from './tax-settings.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [TaxSettingsController],
  providers: [TaxSettingsService],
  exports: [TaxSettingsService],
})
export class TaxSettingsModule {}
