import { Injectable } from '@nestjs/common';
import { SuppliersRepository, SupplierRecord, CreateSupplierInput } from './suppliers.repository';

@Injectable()
export class SuppliersService {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  async findAll(tenantId: string): Promise<SupplierRecord[]> {
    return this.suppliersRepository.findAll(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<SupplierRecord> {
    const supplier = await this.suppliersRepository.findById(id, tenantId);
    if (!supplier) {
      throw new Error(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async create(data: CreateSupplierInput): Promise<SupplierRecord> {
    return this.suppliersRepository.create(data);
  }

  async update(
    id: string,
    tenantId: string,
    update: Partial<CreateSupplierInput>,
  ): Promise<SupplierRecord> {
    return this.suppliersRepository.update(id, tenantId, update);
  }
}
