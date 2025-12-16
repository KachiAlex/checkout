import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private client: PrismaClient | null = null;

  get prisma(): PrismaClient {
    if (!this.client) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error('DATABASE_URL is not configured');
      }
      this.client = new PrismaClient({
        datasources: {
          db: {
            url,
          },
        },
      });
    }
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }
}
