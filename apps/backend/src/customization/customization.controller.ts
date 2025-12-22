import { Controller, Get, Put, UseGuards, Request, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CustomizationService } from './customization.service';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('customization')
@Controller('customization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  private ensureTenantAdmin(req: any) {
    if (req.user?.role !== 'admin' && !req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Only tenant administrators can manage receipt customization');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get receipt customization for current tenant' })
  @ApiResponse({ status: 200, description: 'Customization settings retrieved' })
  async getCustomization(@Request() req: any) {
    // All authenticated users can read customization (needed for receipts)
    // Only admins can update (enforced in PUT endpoint)
    return this.customizationService.getCustomization(req.user.tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Update receipt customization for current tenant' })
  @ApiResponse({ status: 200, description: 'Customization settings updated' })
  async updateCustomization(@Request() req: any, @Body() body: UpdateCustomizationDto) {
    this.ensureTenantAdmin(req);
    return this.customizationService.updateCustomization(req.user.tenantId, body);
  }
}
