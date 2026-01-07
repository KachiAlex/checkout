import { Body, Controller, Post, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { ComputeTaxDto } from './dto/compute-tax.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('accounting')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('compute-tax')
  @ApiOperation({ summary: 'Compute taxes for draft order lines' })
  @ApiResponse({ status: 200, description: 'Computed taxes' })
  async computeTax(
    @Body() dto: ComputeTaxDto,
    @Req() req: Request & { user?: { tenantId?: string } },
  ) {
    const tenantId: string | undefined = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing');
    }
    return this.accountingService.computeOrderTaxes({
      tenantId,
      locationId: dto.locationId,
      defaultTaxRate: dto.defaultTaxRate,
      lines: dto.lines.map((line) => ({
        lineId: line.lineId,
        amountCents: line.amountCents,
        tags: line.tags,
        categoryId: line.categoryId,
        taxRuleId: line.taxRuleId,
      })),
    });
  }
}
