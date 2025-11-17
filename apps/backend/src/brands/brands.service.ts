import { Injectable } from '@nestjs/common';
import { BrandsRepository, BrandRecord, CreateBrandInput } from './brands.repository';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  async findAll(tenantId: string): Promise<BrandRecord[]> {
    return this.brandsRepository.findAll(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<BrandRecord> {
    const brand = await this.brandsRepository.findById(id, tenantId);
    if (!brand) {
      throw new Error(`Brand with ID ${id} not found`);
    }
    return brand;
  }

  async findOrCreateByName(name: string, tenantId: string): Promise<BrandRecord> {
    const existing = await this.brandsRepository.findByName(name, tenantId);
    if (existing) {
      return existing;
    }
    return this.brandsRepository.create({
      tenantId,
      name,
    });
  }

  async create(data: CreateBrandInput): Promise<BrandRecord> {
    return this.brandsRepository.create(data);
  }

  async update(id: string, tenantId: string, update: Partial<CreateBrandInput>): Promise<BrandRecord> {
    return this.brandsRepository.update(id, tenantId, update);
  }
}

