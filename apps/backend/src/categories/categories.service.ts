import { Injectable } from '@nestjs/common';
import { CategoriesRepository, CategoryRecord, CreateCategoryInput } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findAll(tenantId: string): Promise<CategoryRecord[]> {
    return this.categoriesRepository.findAll(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<CategoryRecord> {
    const category = await this.categoriesRepository.findById(id, tenantId);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return category;
  }

  async findOrCreateByName(name: string, tenantId: string): Promise<CategoryRecord> {
    const existing = await this.categoriesRepository.findByName(name, tenantId);
    if (existing) {
      return existing;
    }
    return this.categoriesRepository.create({
      tenantId,
      name,
    });
  }

  async create(data: CreateCategoryInput): Promise<CategoryRecord> {
    return this.categoriesRepository.create(data);
  }

  async update(
    id: string,
    tenantId: string,
    update: Partial<CreateCategoryInput>,
  ): Promise<CategoryRecord> {
    return this.categoriesRepository.update(id, tenantId, update);
  }
}
