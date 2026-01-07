import { Injectable } from '@nestjs/common';
import { Expense, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface CreateExpenseInput {
  tenantId: string;
  locationId?: string;
  amountCents: number;
  currency?: string;
  paymentMethod: string;
  description: string;
  vendor?: string;
  occurredAt?: Date;
  createdBy?: string;
  metadata?: Prisma.JsonValue;
}

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private get prisma() {
    return this.prismaService.prisma;
  }

  async create(input: CreateExpenseInput): Promise<Expense> {
    return this.prisma.expense.create({
      data: {
        tenantId: input.tenantId,
        locationId: input.locationId,
        amountCents: input.amountCents,
        currency: input.currency ?? 'NGN',
        paymentMethod: input.paymentMethod,
        description: input.description,
        vendor: input.vendor,
        occurredAt: input.occurredAt ?? new Date(),
        createdBy: input.createdBy,
        metadata: input.metadata as Prisma.JsonValue,
      },
    });
  }

  async list(
    tenantId: string,
    filters?: { locationId?: string; from?: Date; to?: Date },
  ): Promise<Expense[]> {
    return this.prisma.expense.findMany({
      where: {
        tenantId,
        locationId: filters?.locationId ?? undefined,
        occurredAt:
          filters?.from || filters?.to
            ? {
                gte: filters?.from,
                lte: filters?.to,
              }
            : undefined,
      },
      orderBy: [{ occurredAt: 'desc' }],
    });
  }
}
