import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
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
}
