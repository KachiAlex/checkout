import { IsString, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';

export enum ItemCategory {
  STOCK = 'STOCK',
  FINISHED = 'FINISHED',
  BUNDLE = 'BUNDLE',
}

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  productId: string;

  @IsOptional()
  @IsEnum(ItemCategory)
  productCategory?: ItemCategory;
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ItemCategory)
  productCategory?: ItemCategory;
}

export class CreateRecipeIngredientDto {
  @IsUUID()
  recipeId: string;

  @IsUUID()
  ingredientId: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRecipeIngredientDto {
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
