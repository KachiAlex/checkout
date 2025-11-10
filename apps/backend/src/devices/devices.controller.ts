import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register or update a scanner device' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  async register(
    @Body() dto: RegisterDeviceDto,
    @Request() req: any,
  ) {
    return this.devicesService.registerDevice(dto, req.user?.tenantId, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List registered devices' })
  async findAll(@Request() req: any, @Query('location_id') locationId?: string) {
    return this.devicesService.findAll(req.user?.tenantId, locationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a device record' })
  async update(@Param('id') id: string, @Body() dto: UpdateDeviceDto, @Request() req: any) {
    return this.devicesService.updateDevice(id, req.user?.tenantId, dto);
  }

  @Post(':id/heartbeat')
  @ApiOperation({ summary: 'Record device usage heartbeat' })
  async heartbeat(
    @Param('id') id: string,
    @Body() dto: DeviceHeartbeatDto,
    @Request() req: any,
  ) {
    return this.devicesService.recordHeartbeat(id, req.user?.tenantId, dto, req.user?.id);
  }
}

