import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@pos-checkout/shared';
import { JournalSource, Prisma } from '@prisma/client';
import { ExpensesRepository } from './expenses.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly accountingService: AccountingService,
  ) {}

  private isCashMethod(method: PaymentMethod): boolean {
    return method === PaymentMethod.CASH;
  }

  async createExpense(params: { tenantId: string; createdBy: string; dto: CreateExpenseDto }) {
    if (params.dto.paymentMethod === PaymentMethod.CREDIT) {
      throw new BadRequestException('Credit is not a valid payment method for expenses');
    }

    const occurredAt = params.dto.occurredAt ? new Date(params.dto.occurredAt) : undefined;
    if (params.dto.occurredAt && (!occurredAt || Number.isNaN(occurredAt.getTime()))) {
      throw new BadRequestException('Invalid occurredAt date');
    }

    const expense = await this.expensesRepository.create({
      tenantId: params.tenantId,
      locationId: params.dto.locationId,
      amountCents: params.dto.amountCents,
      paymentMethod: params.dto.paymentMethod,
      description: params.dto.description,
      vendor: params.dto.vendor,
      occurredAt,
      createdBy: params.createdBy,
      metadata: {
        source: 'admin.expenses.create',
      } satisfies Prisma.JsonValue,
    });

    const eventType = this.isCashMethod(params.dto.paymentMethod) ? 'EXPENSE_CASH' : 'EXPENSE_BANK';

    await this.accountingService.postSaleJournal({
      tenantId: params.tenantId,
      locationId: params.dto.locationId,
      source: JournalSource.EXPENSE,
      eventType,
      sourceId: expense.id,
      reference: undefined,
      subtotalCents: expense.amountCents,
      taxCents: 0,
      totalCents: expense.amountCents,
      metadata: {
        trigger: 'expenses.create',
        expenseId: expense.id,
        paymentMethod: params.dto.paymentMethod,
      } satisfies Prisma.JsonValue,
    });

    return expense;
  }

  async listExpenses(params: {
    tenantId: string;
    locationId?: string;
    from?: string;
    to?: string;
  }) {
    const fromDate = params.from ? new Date(params.from) : undefined;
    const toDate = params.to ? new Date(params.to) : undefined;

    if (params.from && Number.isNaN(Date.parse(params.from))) {
      throw new BadRequestException('Invalid from date');
    }
    if (params.to && Number.isNaN(Date.parse(params.to))) {
      throw new BadRequestException('Invalid to date');
    }

    return this.expensesRepository.list(params.tenantId, {
      locationId: params.locationId,
      from: fromDate,
      to: toDate,
    });
  }
}
