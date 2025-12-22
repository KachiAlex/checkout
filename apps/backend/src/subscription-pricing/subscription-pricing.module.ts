import { Module } from '@nestjs/common';
import { SubscriptionPricingController } from './subscription-pricing.controller';
import { SubscriptionPricingService } from './subscription-pricing.service';
import { SubscriptionPricingRepository } from './subscription-pricing.repository';
import { FirestoreModule } from '../firestore/firestore.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FirestoreModule, AuthModule],
  controllers: [SubscriptionPricingController],
  providers: [SubscriptionPricingService, SubscriptionPricingRepository],
  exports: [SubscriptionPricingService],
})
export class SubscriptionPricingModule {}
