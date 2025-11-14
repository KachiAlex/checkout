import { Module } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [TenantsRepository, TenantsService],
  controllers: [TenantsController],
  exports: [TenantsRepository, TenantsService],
})
export class TenantsModule {}

