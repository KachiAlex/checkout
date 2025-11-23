import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationsRepository } from './locations.repository';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LocationsController {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  @Get()
  @ApiOperation({ summary: 'Get all locations for the tenant' })
  async findAll(@Request() req: any) {
    return this.locationsRepository.findByTenant(req.user.tenantId);
  }
}

