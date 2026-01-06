import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, TaxMode } from '@prisma/client';

export interface TaxableLineInput {
  lineId: string;
  amountCents: number;
  taxRuleId?: string;
  tags?: string[];
  categoryId?: string;
}

export interface TaxComputationInput {
  tenantId: string;
  locationId?: string;
  lines: TaxableLineInput[];
  defaultTaxRate?: number;
  taxMode?: TaxMode;
}

export interface ComputedTaxLine {
  lineId: string;
  taxRuleId?: string;
  taxableAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  effectiveRate: number;
}

export interface TaxComputationResult {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  lines: ComputedTaxLine[];
  metadata?: Prisma.JsonValue;
}

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private get prisma() {
    return this.prismaService.prisma;
  }

  async listActiveRules(tenantId: string, locationId?: string) {
    return this.prisma.taxRule.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: locationId ? [{ locationId }, { locationId: null }] : undefined,
      },
      orderBy: [{ locationId: 'desc' }, { effectiveFrom: 'desc' }],
    });
  }

  async computeTaxes(input: TaxComputationInput): Promise<TaxComputationResult> {
    if (input.lines.length === 0) {
      return {
        subtotalCents: 0,
        taxCents: 0,
        totalCents: 0,
        lines: [],
      };
    }

    const rules = await this.listActiveRules(input.tenantId, input.locationId);
    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));

    const lines: ComputedTaxLine[] = [];
    let subtotalCents = 0;
    let taxCents = 0;

    for (const line of input.lines) {
      const rule = (line.taxRuleId && rulesById.get(line.taxRuleId)) ?? this.matchRule(rules, line);
      const rate = rule ? Number(rule.rate) : (input.defaultTaxRate ?? 0);
      const mode = rule?.mode ?? input.taxMode ?? TaxMode.EXCLUSIVE;
      const result = this.calculateForLine(line.amountCents, rate, mode);
      subtotalCents += result.taxableAmountCents;
      taxCents += result.taxAmountCents;
      lines.push({
        lineId: line.lineId,
        taxRuleId: rule?.id,
        taxableAmountCents: result.taxableAmountCents,
        taxAmountCents: result.taxAmountCents,
        totalAmountCents: result.taxableAmountCents + result.taxAmountCents,
        effectiveRate: rate,
      });
    }

    return {
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      lines,
    };
  }

  private matchRule(
    rules: Awaited<ReturnType<typeof this.listActiveRules>>,
    line: TaxableLineInput,
  ) {
    if (!line.tags?.length && !line.categoryId) {
      return undefined;
    }

    return rules.find((rule) => {
      const matchesCategory = line.categoryId && rule.categoryIds?.includes(line.categoryId);
      const matchesTag =
        line.tags?.some((tag) => (rule.applicableTags ?? []).includes(tag)) ?? false;
      return matchesCategory || matchesTag;
    });
  }

  private calculateForLine(amountCents: number, rate: number, mode: TaxMode) {
    if (rate <= 0) {
      return {
        taxableAmountCents: amountCents,
        taxAmountCents: 0,
      };
    }

    if (mode === TaxMode.INCLUSIVE) {
      const net = amountCents / (1 + rate);
      const tax = amountCents - net;
      return {
        taxableAmountCents: Math.round(net),
        taxAmountCents: Math.round(tax),
      };
    }

    const tax = amountCents * rate;
    return {
      taxableAmountCents: amountCents,
      taxAmountCents: Math.round(tax),
    };
  }
}
