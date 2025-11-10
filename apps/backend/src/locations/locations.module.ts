import { Module } from '@nestjs/common';
import { LocationsRepository } from './locations.repository';

@Module({
  providers: [LocationsRepository],
  exports: [LocationsRepository],
})
export class LocationsModule {}
