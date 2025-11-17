import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesRepository, CreateCategoryInput } from './categories.repository';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories for tenant' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAll(@Request() req: any) {
    return this.categoriesService.findAll(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(@Body() createDto: CreateCategoryInput, @Request() req: any) {
    return this.categoriesService.create({
      ...createDto,
      tenantId: req.user.tenantId,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateCategoryInput>,
    @Request() req: any,
  ) {
    return this.categoriesService.update(id, req.user.tenantId, updateDto);
  }
}

