import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSupplierInput } from './suppliers.repository';

type AuthenticatedRequest = Request & { user?: { tenantId?: string } };

@ApiTags('suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers for tenant' })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.suppliersService.findAll(req.user?.tenantId as string);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier found' })
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.suppliersService.findById(id, req.user?.tenantId as string);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  async create(@Body() createDto: CreateSupplierInput, @Req() req: AuthenticatedRequest) {
    return this.suppliersService.create({
      ...createDto,
      tenantId: req.user?.tenantId as string,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateSupplierInput>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.suppliersService.update(id, req.user?.tenantId as string, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiResponse({ status: 204, description: 'Supplier deleted' })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.suppliersService.delete(id, req.user?.tenantId as string);
    return { success: true };
  }
}
