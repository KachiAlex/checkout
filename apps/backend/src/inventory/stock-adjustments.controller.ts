import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StockAdjustmentsService, StockAdjustmentDto } from './stock-adjustments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantsService } from '../tenants/tenants.service';

@Controller('inventory/adjustments')
@UseGuards(JwtAuthGuard)
export class StockAdjustmentsController {
  constructor(
    private readonly stockAdjustmentsService: StockAdjustmentsService,
    private readonly tenantService: TenantsService,
  ) {}

  @Post()
  async create(@Body() data: StockAdjustmentDto, @Request() req) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.sub;
    return this.stockAdjustmentsService.createAdjustment(tenantId, data, userId);
  }

  @Get()
  async findAll(@Request() req, @Param('locationId') locationId?: string) {
    const tenantId = this.getTenantId(req);
    return this.stockAdjustmentsService.getAdjustmentHistory(tenantId, locationId);
  }

  private getTenantId(req: any): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }
    return tenantId;
  }
}
