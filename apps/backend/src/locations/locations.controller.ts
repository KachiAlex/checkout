import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationsRepository, CreateLocationInput } from './locations.repository';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LocationsController {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  @Get()
  @ApiOperation({ summary: 'Get all locations for the tenant' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  async findAll(@Request() req: any) {
    return this.locationsRepository.findByTenant(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  async create(@Request() req: any, @Body() createDto: CreateLocationInput) {
    const location = await this.locationsRepository.create({
      ...createDto,
    });
    // Update location with tenantId
    await this.locationsRepository.update(location.id, { tenantId: req.user.tenantId } as any);
    return this.locationsRepository.findById(location.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateDto: Partial<CreateLocationInput>,
  ) {
    // Verify location belongs to tenant
    const location = await this.locationsRepository.findById(id);
    if (!location || (location.tenantId && location.tenantId !== req.user.tenantId)) {
      throw new Error('Location not found or access denied');
    }
    return this.locationsRepository.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    // Verify location belongs to tenant
    const location = await this.locationsRepository.findById(id);
    if (!location || (location.tenantId && location.tenantId !== req.user.tenantId)) {
      throw new Error('Location not found or access denied');
    }
    await this.locationsRepository.delete(id);
    return { success: true, message: 'Location deleted' };
  }
}
