import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionPaymentsRepository } from './subscription-payments.repository';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TenantsModule, UsersModule, EmailModule],
  controllers: [PlatformController, PlatformAnalyticsController],
  providers: [PlatformService, PlatformAnalyticsService, SubscriptionPaymentsRepository],
  exports: [PlatformService, PlatformAnalyticsService, SubscriptionPaymentsRepository],
})
export class PlatformModule {}
