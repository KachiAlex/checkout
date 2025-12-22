import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomersRepository, CustomerRecord, CreateCustomerInput } from './customers.repository';
import {
  LoyaltyTransactionsRepository,
  LoyaltyTransactionType,
} from './loyalty-transactions.repository';

@Injectable()
export class CustomersService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly loyaltyTransactionsRepository: LoyaltyTransactionsRepository,
  ) {}

  async findAll(tenantId: string): Promise<CustomerRecord[]> {
    return this.customersRepository.findAll(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<CustomerRecord> {
    const customer = await this.customersRepository.findById(id, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByPhone(phone: string, tenantId: string): Promise<CustomerRecord | null> {
    return this.customersRepository.findByPhone(phone, tenantId);
  }

  async findByLoyaltyId(loyaltyId: string, tenantId: string): Promise<CustomerRecord | null> {
    return this.customersRepository.findByLoyaltyId(loyaltyId, tenantId);
  }

  async create(data: CreateCustomerInput): Promise<CustomerRecord> {
    return this.customersRepository.create(data);
  }

  async update(
    id: string,
    tenantId: string,
    update: Partial<CreateCustomerInput>,
  ): Promise<CustomerRecord> {
    return this.customersRepository.update(id, tenantId, update);
  }

  async addLoyaltyPoints(
    id: string,
    tenantId: string,
    points: number,
    orderId?: string,
    reason?: string,
  ): Promise<CustomerRecord> {
    const customer = await this.customersRepository.findById(id, tenantId);
    if (!customer) {
      throw new Error(`Customer ${id} not found`);
    }

    const updated = await this.customersRepository.updateLoyaltyPoints(id, tenantId, points);

    // Record transaction
    await this.loyaltyTransactionsRepository.create({
      customerId: id,
      tenantId,
      type: LoyaltyTransactionType.EARNED,
      points,
      balanceAfter: updated.loyaltyPoints,
      orderId,
      reason: reason || 'Points earned from purchase',
    });

    return updated;
  }

  async redeemLoyaltyPoints(
    id: string,
    tenantId: string,
    points: number,
    reason?: string,
  ): Promise<CustomerRecord> {
    const customer = await this.customersRepository.findById(id, tenantId);
    if (!customer) {
      throw new Error(`Customer ${id} not found`);
    }

    if (customer.loyaltyPoints < points) {
      throw new Error(
        `Insufficient loyalty points. Available: ${customer.loyaltyPoints}, Requested: ${points}`,
      );
    }

    const updated = await this.customersRepository.updateLoyaltyPoints(id, tenantId, -points);

    // Record transaction
    await this.loyaltyTransactionsRepository.create({
      customerId: id,
      tenantId,
      type: LoyaltyTransactionType.REDEEMED,
      points: -points,
      balanceAfter: updated.loyaltyPoints,
      reason: reason || 'Points redeemed',
    });

    return updated;
  }

  async addStoreCredit(id: string, tenantId: string, amountCents: number): Promise<CustomerRecord> {
    return this.customersRepository.updateStoreCredit(id, tenantId, amountCents);
  }

  async useStoreCredit(id: string, tenantId: string, amountCents: number): Promise<CustomerRecord> {
    const customer = await this.customersRepository.findById(id, tenantId);
    if (!customer) {
      throw new Error(`Customer ${id} not found`);
    }

    if (customer.storeCreditCents < amountCents) {
      throw new Error(
        `Insufficient store credit. Available: ${customer.storeCreditCents / 100}, Requested: ${amountCents / 100}`,
      );
    }

    return this.customersRepository.updateStoreCredit(id, tenantId, -amountCents);
  }

  async getLoyaltyTransactions(customerId: string, tenantId: string, limit = 50) {
    return this.loyaltyTransactionsRepository.findByCustomer(customerId, tenantId, limit);
  }
}
