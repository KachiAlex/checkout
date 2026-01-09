import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type AuditActor = {
  tenantId: string;
  actorId?: string;
  locationId?: string;
  deviceId?: string;
};

export type AuditLogEvent = {
  action: string;
  entity: string;
  entityId?: string;
  beforeJson?: Prisma.InputJsonValue | null;
  afterJson?: Prisma.InputJsonValue | null;
  source?: string;
  metadata?: Prisma.InputJsonValue | null;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async purgeOlderThanDays(tenantId: string, retentionDays: number) {
    const days = Math.min(Math.max(Number(retentionDays || 90), 1), 3650);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const result = await this.prismaService.prisma.complianceAuditLog.deleteMany({
        where: {
          tenantId,
          createdAt: { lt: cutoff },
        },
      });

      return {
        deletedCount: result.count,
        cutoff: cutoff.toISOString(),
        retentionDays: days,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to purge audit logs: ${(error as Error)?.message ?? String(error)}`,
      );
      return {
        deletedCount: 0,
        cutoff: cutoff.toISOString(),
        retentionDays: days,
      };
    }
  }

  async list(
    tenantId: string,
    query: {
      take?: number;
      skip?: number;
      from?: string;
      to?: string;
      entity?: string;
      entityId?: string;
      action?: string;
      actorId?: string;
    },
  ) {
    const take = Math.min(Math.max(Number(query.take ?? 50), 1), 200);
    const skip = Math.max(Number(query.skip ?? 0), 0);

    const createdAt: Prisma.ComplianceAuditLogWhereInput['createdAt'] | undefined =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : undefined),
            ...(query.to ? { lte: new Date(query.to) } : undefined),
          }
        : undefined;

    const where: Prisma.ComplianceAuditLogWhereInput = {
      tenantId,
      ...(createdAt ? { createdAt } : undefined),
      ...(query.entity ? { entity: query.entity } : undefined),
      ...(query.entityId ? { entityId: query.entityId } : undefined),
      ...(query.action ? { action: query.action } : undefined),
      ...(query.actorId ? { actorId: query.actorId } : undefined),
    };

    try {
      const [items, total] = await Promise.all([
        this.prismaService.prisma.complianceAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        this.prismaService.prisma.complianceAuditLog.count({ where }),
      ]);

      return {
        items,
        total,
        take,
        skip,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to list audit logs: ${(error as Error)?.message ?? String(error)}`,
      );
      return {
        items: [],
        total: 0,
        take,
        skip,
      };
    }
  }

  async getById(tenantId: string, id: string) {
    try {
      const row = await this.prismaService.prisma.complianceAuditLog.findFirst({
        where: { id, tenantId },
      });
      return row;
    } catch (error) {
      this.logger.warn(
        `Failed to get audit log by id: ${(error as Error)?.message ?? String(error)}`,
      );
      return null;
    }
  }

  async create(actor: AuditActor, event: AuditLogEvent): Promise<void> {
    if (!actor.tenantId) {
      return;
    }

    try {
      await this.prismaService.prisma.complianceAuditLog.create({
        data: {
          tenantId: actor.tenantId,
          actorId: actor.actorId,
          action: event.action,
          entity: event.entity,
          entityId: event.entityId,
          beforeJson: event.beforeJson ?? undefined,
          afterJson: event.afterJson ?? undefined,
          source: event.source,
          deviceId: actor.deviceId,
          metadata: event.metadata ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to write audit log: ${(error as Error)?.message ?? String(error)}`);
    }
  }
}
