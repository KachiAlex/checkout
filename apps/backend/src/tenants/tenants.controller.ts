import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ResetTenantAdminPinDto } from './dto/reset-tenant-admin-pin.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';

@ApiTags('tenants')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('platform/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  private ensurePlatformAdmin(req: any) {
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Only platform administrators can manage tenants');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant/company' })
  async create(@Request() req: any, @Body() dto: CreateTenantDto) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tenants' })
  async findAll(@Request() req: any) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findById(@Request() req: any, @Param('id') id: string) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant details' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.update(id, dto);
  }

  @Post(':id/subscription')
  @ApiOperation({ summary: 'Adjust tenant subscription metadata' })
  async updateSubscription(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.updateSubscription(id, dto);
  }

  @Post(':id/reset-admin-pin')
  @ApiOperation({ summary: 'Reset the primary tenant admin PIN' })
  async resetAdminPin(@Request() req: any, @Param('id') id: string, @Body() dto: ResetTenantAdminPinDto) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.resetAdminPin(id, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend a tenant' })
  async suspend(@Request() req: any, @Param('id') id: string, @Body() dto: SuspendTenantDto) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.suspend(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Reactivate a suspended tenant' })
  async activate(@Request() req: any, @Param('id') id: string) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.activate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tenant' })
  async delete(@Request() req: any, @Param('id') id: string) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.deleteTenant(id);
  }
}

