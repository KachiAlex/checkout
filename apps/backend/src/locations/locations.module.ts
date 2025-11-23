import { Module } from '@nestjs/common';
import { LocationsRepository } from './locations.repository';
import { LocationsController } from './locations.controller';

@Module({
  controllers: [LocationsController],
  providers: [LocationsRepository],
  exports: [LocationsRepository],
})
export class LocationsModule {}
