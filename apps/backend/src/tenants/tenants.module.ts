import { Module } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { IndustryFeaturesService } from './industry-features.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [TenantsRepository, TenantsService, IndustryFeaturesService],
  controllers: [TenantsController],
  exports: [TenantsRepository, TenantsService, IndustryFeaturesService],
})
export class TenantsModule {}
