import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto, UpdateRecipeDto, CreateRecipeIngredientDto, UpdateRecipeIngredientDto } from './dto/recipe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantsService } from '../tenants/tenants.service';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly tenantService: TenantsService,
  ) {}

  @Post()
  async create(@Body() createRecipeDto: CreateRecipeDto, @Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.create(createRecipeDto, tenantId);
  }

  @Get()
  async findAll(@Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.findOne(id, tenantId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRecipeDto: UpdateRecipeDto, @Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.update(id, updateRecipeDto, tenantId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.remove(id, tenantId);
  }

  // RecipeIngredient endpoints
  @Post(':recipeId/ingredients')
  async addIngredient(@Body() createIngredientDto: CreateRecipeIngredientDto, @Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.addIngredient(createIngredientDto, tenantId);
  }

  @Patch('ingredients/:id')
  async updateIngredient(@Param('id') id: string, @Body() updateIngredientDto: UpdateRecipeIngredientDto, @Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.updateIngredient(id, updateIngredientDto, tenantId);
  }

  @Delete('ingredients/:id')
  async removeIngredient(@Param('id') id: string, @Request() req) {
    const tenantId = this.getTenantId(req);
    return this.recipesService.removeIngredient(id, tenantId);
  }

  private getTenantId(req: any): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }
    return tenantId;
  }
}
