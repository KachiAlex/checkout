import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandsRepository, CreateBrandInput } from './brands.repository';

@ApiTags('brands')
@Controller('brands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all brands for tenant' })
  @ApiResponse({ status: 200, description: 'List of brands' })
  async findAll(@Request() req: any) {
    if (!req.user?.tenantId) {
      throw new UnauthorizedException('User or tenantId not found in request');
    }
    return this.brandsService.findAll(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({ status: 201, description: 'Brand created' })
  async create(@Body() createDto: CreateBrandInput, @Request() req: any) {
    return this.brandsService.create({
      ...createDto,
      tenantId: req.user.tenantId,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a brand' })
  @ApiResponse({ status: 200, description: 'Brand updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateBrandInput>,
    @Request() req: any,
  ) {
    return this.brandsService.update(id, req.user.tenantId, updateDto);
  }
}

