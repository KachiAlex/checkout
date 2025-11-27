import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [LocationsModule],
  providers: [UsersRepository, UsersService],
  controllers: [UsersController],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
