import {
  Body,
  Controller,
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
    @Body() body: {
      plan?: string;
      status?: string;
      seatLimit?: number;
      billingCycleStart?: string;
      billingCycleEnd?: string;
    },
  ) {
    this.ensurePlatformAdmin(req);
    return this.tenantsService.update(id, {
      plan: body.plan as any,
      status: body.status as any,
      seatLimit: body.seatLimit,
      billingCycleStart: body.billingCycleStart,
      billingCycleEnd: body.billingCycleEnd,
    });
  }
}

