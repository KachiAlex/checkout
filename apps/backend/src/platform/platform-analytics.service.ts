import { Injectable } from '@nestjs/common';
import { PaymentStatus, TenantPlan, TenantStatus } from '@pos-checkout/shared';
import { SubscriptionPaymentsRepository } from './subscription-payments.repository';
import { TenantsRepository, TenantRecord } from '../tenants/tenants.repository';

export type PlatformAnalyticsPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

interface DateRangeConfig {
  fromDate: Date;
  toDate: Date;
  groupBy: (date: Date) => string;
}

@Injectable()
export class PlatformAnalyticsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly subscriptionPaymentsRepository: SubscriptionPaymentsRepository,
  ) {}

  async getRevenueAnalytics(period: PlatformAnalyticsPeriod, from?: string, to?: string) {
    const { fromDate, toDate, groupBy } = this.resolveDateRange(period, from, to);
    const payments = await this.subscriptionPaymentsRepository.list({
      status: PaymentStatus.COMPLETED,
      from: fromDate,
      to: toDate,
    });

    const grouped = new Map<
      string,
      { revenueCents: number; payments: number; tenants: Set<string>; plans: Record<string, number> }
    >();
    let totalRevenueCents = 0;
    let totalPayments = 0;

    payments.forEach((payment) => {
      const paidAt = payment.paidAt ?? payment.updatedAt ?? payment.createdAt;
      const key = groupBy(paidAt);
      const bucket =
        grouped.get(key) ||
        { revenueCents: 0, payments: 0, tenants: new Set<string>(), plans: {} };
      bucket.revenueCents += payment.amountCents;
      bucket.payments += 1;
      bucket.tenants.add(payment.tenantId);
      bucket.plans[payment.plan] = (bucket.plans[payment.plan] || 0) + payment.amountCents;
      grouped.set(key, bucket);

      totalRevenueCents += payment.amountCents;
      totalPayments += 1;
    });

    const series = Array.from(grouped.entries())
      .map(([bucket, stats]) => ({
        period: bucket,
        revenue: stats.revenueCents / 100,
        payments: stats.payments,
        tenantCount: stats.tenants.size,
        planMix: Object.entries(stats.plans).map(([plan, cents]) => ({
          plan,
          revenue: cents / 100,
        })),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const averageDealSize = totalPayments > 0 ? totalRevenueCents / 100 / totalPayments : 0;
    const plansBreakdown = payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.plan] = (acc[payment.plan] || 0) + payment.amountCents;
      return acc;
    }, {});

    const planSeries = Object.entries(plansBreakdown)
      .map(([plan, cents]) => ({
        plan,
        revenue: cents / 100,
        percent:
          totalRevenueCents > 0 ? Number(((cents / totalRevenueCents) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      period,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      totals: {
        revenue: totalRevenueCents / 100,
        payments: totalPayments,
        averageDealSize,
        uniqueTenants: new Set(payments.map((p) => p.tenantId)).size,
      },
      planBreakdown: planSeries,
      series,
    };
  }

  async getClientsOverview(params: {
    limit?: number;
    offset?: number;
    plan?: TenantPlan;
    status?: TenantStatus;
  }) {
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const offset = params.offset && params.offset >= 0 ? params.offset : 0;

    const tenants = await this.tenantsRepository.findAll();
    const filtered = tenants.filter((tenant) => {
      if (params.plan && tenant.plan !== params.plan) {
        return false;
      }
      if (params.status && tenant.status !== params.status) {
        return false;
      }
      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);
    const tenantIds = paginated.map((tenant) => tenant.id);

    const payments = tenantIds.length
      ? await this.subscriptionPaymentsRepository.list({
          tenantIds,
          status: PaymentStatus.COMPLETED,
        })
      : [];

    const paymentsByTenant = this.groupPaymentsByTenant(payments);

    const items = paginated.map((tenant) => {
      const stats = paymentsByTenant.get(tenant.id);
      return {
        tenant: this.serializeTenant(tenant),
        billingCycle: {
          start: tenant.billingCycleStart?.toISOString(),
          end: tenant.billingCycleEnd?.toISOString(),
        },
        plan: tenant.plan,
        status: tenant.status,
        seatLimit: tenant.seatLimit,
        contactEmail: tenant.contactEmail,
        createdAt: tenant.createdAt.toISOString(),
        lastPaymentAt: stats?.lastPayment?.toISOString() ?? null,
        totalPaid: stats ? stats.revenueCents / 100 : 0,
        paymentCount: stats?.count ?? 0,
      };
    });

    const stats = await this.computeClientStats(tenants);

    return {
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      stats,
      items,
    };
  }

  private groupPaymentsByTenant(payments: Awaited<
    ReturnType<SubscriptionPaymentsRepository['list']>
  >) {
    const map = new Map<
      string,
      { revenueCents: number; count: number; lastPayment: Date | null }
    >();

    payments.forEach((payment) => {
      const bucket =
        map.get(payment.tenantId) || { revenueCents: 0, count: 0, lastPayment: null };
      bucket.revenueCents += payment.amountCents;
      bucket.count += 1;
      const paidAt = payment.paidAt ?? payment.updatedAt ?? payment.createdAt;
      if (!bucket.lastPayment || paidAt > bucket.lastPayment) {
        bucket.lastPayment = paidAt;
      }
      map.set(payment.tenantId, bucket);
    });

    return map;
  }

  private async computeClientStats(tenants: TenantRecord[]) {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === TenantStatus.ACTIVE).length;
    const suspendedTenants = tenants.filter((t) => t.status === TenantStatus.SUSPENDED).length;
    const trialTenants = tenants.filter((t) => t.plan === TenantPlan.FREE).length;
    const payingTenants = tenants.filter((t) => t.plan !== TenantPlan.FREE).length;

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentPayments = await this.subscriptionPaymentsRepository.list({
      status: PaymentStatus.COMPLETED,
      from: last30Days,
    });
    const mrr = recentPayments.reduce((sum, payment) => sum + payment.amountCents, 0) / 100;

    const planDistribution = tenants.reduce<Record<string, number>>((acc, tenant) => {
      acc[tenant.plan] = (acc[tenant.plan] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      payingTenants,
      mrr,
      planDistribution,
    };
  }

  private serializeTenant(tenant: TenantRecord) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    };
  }

  private resolveDateRange(
    period: PlatformAnalyticsPeriod,
    from?: string,
    to?: string,
  ): DateRangeConfig {
    const toDate = to ? new Date(to) : new Date();
    const toDateEndOfDay = new Date(toDate);
    toDateEndOfDay.setHours(23, 59, 59, 999);

    let fromDate: Date;
    let groupBy: (date: Date) => string;

    if (from) {
      fromDate = new Date(from);
    } else {
      switch (period) {
        case 'daily':
          fromDate = new Date(toDateEndOfDay);
          fromDate.setDate(fromDate.getDate() - 29);
          break;
        case 'weekly':
          fromDate = new Date(toDateEndOfDay);
          fromDate.setDate(fromDate.getDate() - 7 * 12 + 1);
          break;
        case 'monthly':
          fromDate = new Date(toDateEndOfDay);
          fromDate.setMonth(fromDate.getMonth() - 11);
          fromDate.setDate(1);
          break;
        case 'quarterly':
          fromDate = new Date(toDateEndOfDay);
          fromDate.setMonth(fromDate.getMonth() - 3 * 7);
          fromDate.setDate(1);
          break;
        case 'yearly':
        default:
          fromDate = new Date(toDateEndOfDay);
          fromDate.setFullYear(fromDate.getFullYear() - 4);
          fromDate.setMonth(0, 1);
          break;
      }
    }

    switch (period) {
      case 'daily':
        groupBy = (date: Date) => date.toISOString().split('T')[0];
        break;
      case 'weekly':
        groupBy = (date: Date) => {
          const temp = new Date(date);
          const firstDayOfWeek = temp.getDate() - temp.getDay();
          temp.setDate(firstDayOfWeek);
          const year = temp.getFullYear();
          const startOfYear = new Date(year, 0, 1);
          const week =
            Math.ceil(((temp.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7) ||
            1;
          return `${year}-W${String(week).padStart(2, '0')}`;
        };
        break;
      case 'monthly':
        groupBy = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        groupBy = (date: Date) => {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${date.getFullYear()}-Q${quarter}`;
        };
        break;
      case 'yearly':
      default:
        groupBy = (date: Date) => `${date.getFullYear()}`;
        break;
    }

    return { fromDate, toDate: toDateEndOfDay, groupBy };
  }
}
