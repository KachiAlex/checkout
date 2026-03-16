import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const isDesktopMode = process.env.DESKTOP_MODE === 'true';
const desktopDbFallback = process.env.DESKTOP_SQLITE_PATH || 'file:../data/checkout-desktop.db';
const resolvedDatabaseUrl =
  process.env.DATABASE_URL || (isDesktopMode ? desktopDbFallback : undefined);

if (!resolvedDatabaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Provide it via .env or set DESKTOP_SQLITE_PATH for desktop builds.',
  );
}

process.env.DATABASE_URL = resolvedDatabaseUrl;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: resolvedDatabaseUrl,
        },
      },
    });
  }

  // Backward compatibility getter for existing code that uses prismaService.prisma
  get prisma(): PrismaClient {
    return this;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
