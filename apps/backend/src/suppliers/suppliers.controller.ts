import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuppliersRepository, CreateSupplierInput } from './suppliers.repository';

@ApiTags('suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers for tenant' })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  async findAll(@Request() req: any) {
    return this.suppliersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.suppliersService.findById(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  async create(@Body() createDto: CreateSupplierInput, @Request() req: any) {
    return this.suppliersService.create({
      ...createDto,
      tenantId: req.user.tenantId,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateSupplierInput>,
    @Request() req: any,
  ) {
    return this.suppliersService.update(id, req.user.tenantId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiResponse({ status: 204, description: 'Supplier deleted' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.suppliersService.delete(id, req.user.tenantId);
    return { success: true };
  }
}
