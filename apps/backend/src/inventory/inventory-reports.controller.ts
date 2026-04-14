import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryReportsService } from './inventory-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantsService } from '../tenants/tenants.service';

@Controller('inventory/reports')
@UseGuards(JwtAuthGuard)
export class InventoryReportsController {
  constructor(
    private readonly inventoryReportsService: InventoryReportsService,
    private readonly tenantService: TenantsService,
  ) {}

  @Get('stock-on-hand')
  async stockOnHand(@Request() req, @Query('locationId') locationId?: string) {
    const tenantId = this.getTenantId(req);
    return this.inventoryReportsService.stockOnHand(tenantId, locationId);
  }

  @Get('cost-margin')
  async costAndMargin(@Request() req, @Query('locationId') locationId?: string) {
    const tenantId = this.getTenantId(req);
    return this.inventoryReportsService.costAndMargin(tenantId, locationId);
  }

  @Get('variance')
  async variance(@Request() req, @Query('locationId') locationId?: string) {
    const tenantId = this.getTenantId(req);
    return this.inventoryReportsService.varianceReport(tenantId, locationId);
  }

  private getTenantId(req: any): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }
    return tenantId;
  }
}
