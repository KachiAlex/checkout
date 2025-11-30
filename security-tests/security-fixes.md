# Security Fixes Implementation Guide

## Priority 1: Critical Fixes

### 1. Fix JWT Secret Default
**File:** `apps/backend/src/auth/strategies/jwt.strategy.ts`

```typescript
// BEFORE
secretOrKey: configService.get<string>('JWT_SECRET', 'change-me'),

// AFTER
secretOrKey: configService.get<string>('JWT_SECRET') || (() => {
  throw new Error('JWT_SECRET environment variable is required');
})(),
```

### 2. Add Tenant Isolation to Orders
**File:** `apps/backend/src/orders/orders.controller.ts`

```typescript
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
  const order = await this.ordersService.findOne(id);
  
  // Add tenant verification
  if (order.tenantId !== req.user.tenantId) {
    throw new ForbiddenException('Access denied');
  }
  
  return order;
}
```

### 3. Add Rate Limiting
**File:** `apps/backend/src/auth/auth.controller.ts`

```typescript
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle(5, 900) // 5 requests per 15 minutes
async login(@Body() loginDto: LoginDto) {
  // ... existing code
}
```

## Priority 2: High Priority Fixes

### 4. Add Location Ownership Validation
**File:** `apps/backend/src/inventory/inventory.controller.ts`

```typescript
@Get(':location_id/stock')
async getStock(
  @Param('location_id') locationId: string,
  @Request() req: any,
) {
  const tenantId = req.user?.tenantId;
  
  // Verify location belongs to tenant
  const location = await this.locationsRepository.findById(locationId);
  if (!location || location.tenantId !== tenantId) {
    throw new ForbiddenException('Access denied to this location');
  }
  
  return this.inventoryService.getStock(locationId, tenantId);
}
```

### 5. Add Role-Based Access Control
**File:** `apps/backend/src/auth/guards/roles.guard.ts` (NEW FILE)

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@pos-checkout/shared';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

### 6. Server-Side Price Validation
**File:** `apps/backend/src/orders/orders.service.ts`

```typescript
private async validateOrderPrices(dto: CreateOrderDto, tenantId: string): Promise<void> {
  for (const item of dto.items) {
    const product = await this.productsService.findOne(item.productId, tenantId);
    
    // Use server-side price, not client-provided
    if (item.priceCents !== product.priceCents) {
      throw new BadRequestException(
        `Price mismatch for product ${item.productId}. Expected ${product.priceCents}, got ${item.priceCents}`
      );
    }
  }
}
```

## Priority 3: Medium Priority Fixes

### 7. Increase PIN Length
**File:** `apps/backend/src/auth/dto/login.dto.ts`

```typescript
@MinLength(6) // Changed from 4
@MaxLength(64)
pin!: string;
```

### 8. Remove Sensitive Logging
**File:** `apps/backend/src/auth/auth.service.ts`

```typescript
// BEFORE
console.log(`[AuthService] Login attempt with PIN: ${loginDto.pin?.substring(0, 2)}**`);

// AFTER
console.log(`[AuthService] Login attempt for tenant: ${loginDto.tenantSlug}`);
```

### 9. Enable Content Security Policy
**File:** `apps/backend/src/app.bootstrap.ts`

```typescript
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust for your needs
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
);
```

### 10. Fix CORS Configuration
**File:** `apps/backend/src/app.bootstrap.ts`

```typescript
// Remove development mode bypass
// BEFORE
if (nodeEnv === 'development') {
  corsOrigins = true;
}

// AFTER
// Always use configured origins, even in development
if (corsOriginConfig.trim() === '*') {
  console.warn('⚠️  CORS allows all origins - not recommended for production');
  corsOrigins = true;
}
```


