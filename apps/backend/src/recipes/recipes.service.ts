import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRecipeDto, UpdateRecipeDto, CreateRecipeIngredientDto, UpdateRecipeIngredientDto, ItemCategory } from './dto/recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRecipeDto: CreateRecipeDto, tenantId: string) {
    const { productId, ...data } = createRecipeDto;
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.category !== ItemCategory.BUNDLE && product.category !== ItemCategory.FINISHED) {
      throw new BadRequestException('Only BUNDLE or FINISHED products can have recipes');
    }
    return this.prisma.recipe.create({
      data: {
        ...data,
        tenantId,
        productId,
      },
      include: {
        product: true,
        ingredients: {
          include: { ingredient: true },
        },
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.recipe.findMany({
      where: { tenantId },
      include: {
        product: true,
        ingredients: {
          include: { ingredient: true },
        },
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, tenantId },
      include: {
        product: true,
        ingredients: {
          include: { ingredient: true },
        },
      },
    });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    return recipe;
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.recipe.update({
      where: { id },
      data: updateRecipeDto,
      include: {
        product: true,
        ingredients: {
          include: { ingredient: true },
        },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.recipe.delete({
      where: { id },
    });
  }

  // RecipeIngredient CRUD
  async addIngredient(createIngredientDto: CreateRecipeIngredientDto, tenantId: string) {
    const { recipeId, ingredientId, ...data } = createIngredientDto;
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
    });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    const ingredient = await this.prisma.product.findFirst({
      where: { id: ingredientId, tenantId },
    });
    if (!ingredient) {
      throw new NotFoundException('Ingredient product not found');
    }
    return this.prisma.recipeIngredient.create({
      data: {
        ...data,
        tenantId,
        recipeId,
        ingredientId,
      },
      include: {
        ingredient: true,
        recipe: { include: { product: true } },
      },
    });
  }

  async updateIngredient(id: string, updateIngredientDto: UpdateRecipeIngredientDto, tenantId: string) {
    const ingredient = await this.prisma.recipeIngredient.findFirst({
      where: { id, tenantId },
    });
    if (!ingredient) {
      throw new NotFoundException('Recipe ingredient not found');
    }
    return this.prisma.recipeIngredient.update({
      where: { id },
      data: updateIngredientDto,
      include: {
        ingredient: true,
        recipe: { include: { product: true } },
      },
    });
  }

  async removeIngredient(id: string, tenantId: string) {
    const ingredient = await this.prisma.recipeIngredient.findFirst({
      where: { id, tenantId },
    });
    if (!ingredient) {
      throw new NotFoundException('Recipe ingredient not found');
    }
    return this.prisma.recipeIngredient.delete({
      where: { id },
    });
  }
}
