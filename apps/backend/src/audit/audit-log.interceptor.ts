import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
 import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

type JwtUser = {
  sub?: string;
  tenantId?: string;
  locationId?: string;
  deviceId?: string;
  role?: string;
  isPlatformAdmin?: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function redactValue(key: string, value: unknown): unknown {
  const lowered = key.toLowerCase();
  const isSensitiveKey =
    lowered.includes('password') ||
    lowered.includes('token') ||
    lowered.includes('secret') ||
    lowered.includes('authorization') ||
    lowered.includes('apikey') ||
    lowered.includes('api_key') ||
    lowered.includes('card') ||
    lowered.includes('pan') ||
    lowered.includes('cvv') ||
    lowered.includes('pin');

  if (isSensitiveKey) {
    return '[REDACTED]';
  }

  return value;
}

function sanitizeJson(value: unknown, depth = 0): Prisma.InputJsonValue {
  if (depth > 6) {
    return '[TRUNCATED]';
  }

  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeJson(item, depth + 1));
  }

  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    const keys = Object.keys(value).slice(0, 50);
    for (const key of keys) {
      out[key] = sanitizeJson(redactValue(key, value[key]), depth + 1);
    }
    return out as Prisma.InputJsonValue;
  }

  if (typeof value === 'string') {
    if (value.length > 2000) {
      return `${value.slice(0, 2000)}...`;
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

function guessEntity(path: string): string {
  const parts = path.split('?')[0].split('/').filter(Boolean);
  return parts[0] ?? 'unknown';
}

function guessEntityId(params: Record<string, unknown> | undefined): string | undefined {
  if (!params) {
    return undefined;
  }

  const direct = params['id'];
  if (typeof direct === 'string' && direct) {
    return direct;
  }

  for (const key of Object.keys(params)) {
    const value = params[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }

  return undefined;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<any>();

    const method = String(req?.method ?? '').toUpperCase();
    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!shouldAudit) {
      return next.handle();
    }

    const user: JwtUser | undefined = req?.user;
    if (!user?.tenantId) {
      return next.handle();
    }

    const originalUrl = String(req?.originalUrl ?? req?.url ?? '');
    const entity = guessEntity(originalUrl);
    const entityId = guessEntityId(req?.params);
    const action = `${method} ${originalUrl.split('?')[0]}`;

    const beforeJson = null;
    const afterJson = sanitizeJson({
      params: req?.params,
      query: req?.query,
      body: req?.body,
    });

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          void this.auditLogService.create(
            {
              tenantId: user.tenantId as string,
              actorId: user.sub,
              locationId: user.locationId,
              deviceId: user.deviceId,
            },
            {
              action,
              entity,
              entityId,
              beforeJson,
              afterJson,
              source: 'api',
              metadata: sanitizeJson({
                statusCode: httpContext.getResponse<any>()?.statusCode,
                role: user.role,
                ok: true,
              }),
            },
          );
        },
        error: (err: unknown) => {
          void this.auditLogService.create(
            {
              tenantId: user.tenantId as string,
              actorId: user.sub,
              locationId: user.locationId,
              deviceId: user.deviceId,
            },
            {
              action,
              entity,
              entityId,
              beforeJson,
              afterJson,
              source: 'api',
              metadata: sanitizeJson({
                statusCode: httpContext.getResponse<any>()?.statusCode,
                role: user.role,
                error: (err as Error)?.message ?? String(err),
                ok: false,
              }),
            },
          );
        },
      }),
    );
  }
}
