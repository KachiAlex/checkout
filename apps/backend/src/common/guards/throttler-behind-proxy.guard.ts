import { Inject, Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, THROTTLER_OPTIONS, ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  constructor(
    @Inject(THROTTLER_OPTIONS) options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorage) storage: any,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(options, storage, reflector);
  }

  // Skip throttling for OPTIONS requests (CORS preflight)
  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Skip throttling for OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return Promise.resolve(true);
    }
    
    return super.canActivate(context);
  }
}

