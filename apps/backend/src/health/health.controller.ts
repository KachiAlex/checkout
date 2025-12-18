import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FirestoreService } from '../firestore/firestore.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly firestoreService: FirestoreService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pos-backend',
    };
  }

  // Also register at root level for easier health checks
  @Get('ping')
  ping() {
    return { pong: true, timestamp: new Date().toISOString() };
  }

  @Get('firestore')
  @ApiOperation({ summary: 'Firestore health check endpoint' })
  async firestore() {
    const isHealthy = await this.firestoreService.healthCheck();
    if (!isHealthy) {
      throw new ServiceUnavailableException('Firestore health check failed');
    }
    return { status: 'ok', firestore: true, timestamp: new Date().toISOString() };
  }
}
