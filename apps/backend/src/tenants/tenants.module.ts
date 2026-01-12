import { Module } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { IndustryFeaturesService } from './industry-features.service';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [UsersModule, EmailModule],
  providers: [TenantsRepository, TenantsService, IndustryFeaturesService],
  controllers: [TenantsController],
  exports: [TenantsRepository, TenantsService, IndustryFeaturesService],
})
export class TenantsModule {}
