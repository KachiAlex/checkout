import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { DeviceRegisterDto } from './dto/device-register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersRepository, UserRecord } from '../users/users.repository';
import { TenantStatus, UserRole } from '@pos-checkout/shared';
import { TenantsRepository } from '../tenants/tenants.repository';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Injectable()
export class AuthService {
  // Simple in-memory cache per function instance to reduce Firestore reads
  private readonly userCache = new Map<string, { users: UserRecord[]; fetchedAt: number }>();

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tenantsRepository: TenantsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async getTenantUsers(tenantId: string): Promise<UserRecord[]> {
    const CACHE_TTL_MS = 60_000; // 60 seconds
    const cached = this.userCache.get(tenantId);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.users;
    }

    const users = await this.usersRepository.findAll(tenantId);
    this.userCache.set(tenantId, { users, fetchedAt: now });
    return users;
  }

  async validateUser(pin: string, tenantId: string, deviceId?: string): Promise<UserRecord | null> {
    // Fast path: if deviceId is known, try that user first
    if (deviceId) {
      try {
        const deviceUser = await this.usersRepository.findByDeviceId(deviceId, tenantId);
        if (deviceUser) {
          const isValid = await bcrypt.compare(pin, deviceUser.pinHash);
          if (isValid) {
            return deviceUser;
          }
        }
      } catch (error) {
        console.warn('[AuthService] Device-based lookup failed, falling back to full scan:', (error as any)?.message);
      }
    }

    // Fallback: scan tenant users, using a short-lived cache to avoid repeated Firestore reads
    const users = await this.getTenantUsers(tenantId);

    for (const user of users) {
      try {
        const isValid = await bcrypt.compare(pin, user.pinHash);
        if (isValid) {
          // Update device ID if provided
          if (deviceId && user.deviceId !== deviceId) {
            try {
              const updated = await this.usersRepository.update(user.id, { deviceId });
              user.deviceId = updated.deviceId;
            } catch (error) {
              // Log error but don't fail login if device ID save fails
              console.warn('[AuthService] Failed to save device ID:', (error as any)?.message);
            }
          }
          return user;
        }
      } catch (error) {
        console.error('[AuthService] Error comparing PIN for user', user.id, (error as any)?.message);
      }
    }

    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Log login attempt without sensitive data
    console.log(`[AuthService] Login attempt for tenant: ${loginDto.tenantSlug}`);
    const tenant = await this.tenantsRepository.findBySlug(loginDto.tenantSlug);

    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant');
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException(`Tenant ${tenant.slug} is not active`);
    }

    const user = await this.validateUser(loginDto.pin, tenant.id, loginDto.deviceId);
    
    if (!user) {
      console.log(`[AuthService] Login failed for tenant: ${loginDto.tenantSlug}`);
      throw new UnauthorizedException('Invalid PIN');
    }
    
    console.log(`[AuthService] Login successful for user: ${user.id} (${user.name})`);

    const payload = {
      sub: user.id,
      role: user.role,
      locationId: user.locationId,
      deviceId: user.deviceId,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '24h', // Fixed to 24h to prevent 15m expiration from .env
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        locationId: user.locationId || undefined,
        tenantId: user.tenantId,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        seatLimit: tenant.seatLimit,
        contactEmail: tenant.contactEmail,
        billingCycleStart: tenant.billingCycleStart?.toISOString(),
        billingCycleEnd: tenant.billingCycleEnd?.toISOString(),
      },
    };
  }

  async loginSuperAdmin(dto: SuperAdminLoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user || !user.isPlatformAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.pinHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tenant = await this.tenantsRepository.findById(user.tenantId);

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException(`Tenant ${tenant.slug} is not active`);
    }

    const payload = {
      sub: user.id,
      role: user.role,
      locationId: user.locationId,
      deviceId: user.deviceId,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '24h', // Fixed to 24h to prevent 15m expiration from .env
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        locationId: user.locationId || undefined,
        tenantId: user.tenantId,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        seatLimit: tenant.seatLimit,
        contactEmail: tenant.contactEmail,
        billingCycleStart: tenant.billingCycleStart?.toISOString(),
        billingCycleEnd: tenant.billingCycleEnd?.toISOString(),
      },
    };
  }

  async registerDevice(dto: DeviceRegisterDto): Promise<{ success: boolean; message: string }> {
    const tenant = await this.tenantsRepository.findBySlug(dto.tenantSlug);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if device already registered
    const existingUser = dto.deviceId
      ? await this.usersRepository.findByDeviceId(dto.deviceId, tenant.id)
      : null;

    if (existingUser) {
      // Update public key
      await this.usersRepository.update(existingUser.id, {
        publicKey: dto.publicKey,
        locationId: dto.locationId ?? existingUser.locationId,
      });
      return { success: true, message: 'Device updated successfully' };
    }

    // For MVP: Associate with first available user or create a system user
    // In production, device registration should go through an admin flow
    const systemUser = await this.usersRepository.findByRole(UserRole.ADMIN, tenant.id);

    if (systemUser) {
      await this.usersRepository.update(systemUser.id, {
        deviceId: dto.deviceId,
        publicKey: dto.publicKey,
        locationId: dto.locationId ?? systemUser.locationId,
      });
      return { success: true, message: 'Device registered successfully' };
    }

    return { success: false, message: 'No system user found for device registration' };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (!payload.tenantId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.usersRepository.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.tenantId !== payload.tenantId) {
        throw new UnauthorizedException('Tenant mismatch');
      }

      const tenant = await this.tenantsRepository.findById(payload.tenantId);
      if (!tenant) {
        throw new UnauthorizedException('Tenant no longer exists');
      }

      const newPayload = {
        sub: user.id,
        role: user.role,
        locationId: user.locationId,
        deviceId: user.deviceId,
        tenantId: user.tenantId,
        isPlatformAdmin: user.isPlatformAdmin,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: '24h', // Fixed to 24h to prevent 15m expiration from .env
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          locationId: user.locationId || undefined,
          tenantId: user.tenantId,
          isPlatformAdmin: user.isPlatformAdmin,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
          seatLimit: tenant.seatLimit,
          contactEmail: tenant.contactEmail,
          billingCycleStart: tenant.billingCycleStart?.toISOString(),
          billingCycleEnd: tenant.billingCycleEnd?.toISOString(),
        },
      };
    } catch (error) {
      console.error('[AuthService] Refresh token error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }
  }
}
