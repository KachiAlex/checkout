import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersRepository, UserRecord } from '../users/users.repository';
import { TenantsRepository, TenantRecord } from '../tenants/tenants.repository';
import { TenantPlan, TenantStatus } from '@pos-checkout/shared';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let tenantsRepository: jest.Mocked<TenantsRepository>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser: UserRecord = {
    id: 'user-123',
    name: 'Test User',
    role: 'cashier' as any,
    pinHash: 'hashed-pin',
    tenantId: 'tenant-123',
    isPlatformAdmin: false,
    locationId: 'location-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTenant: TenantRecord = {
    id: 'tenant-123',
    name: 'Acme Retail',
    slug: 'acme',
    plan: TenantPlan.MONTHLY,
    status: TenantStatus.ACTIVE,
    seatLimit: 10,
    contactEmail: 'billing@acme.com',
    billingCycleStart: new Date(),
    billingCycleEnd: new Date(),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findAll: jest.fn(),
            findByDeviceId: jest.fn(),
            findByRole: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          } as Partial<jest.Mocked<UsersRepository>>,
        },
        {
          provide: TenantsRepository,
          useValue: {
            findBySlug: jest.fn(),
            findById: jest.fn(),
          } as Partial<jest.Mocked<TenantsRepository>>,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload, options) => `token-${payload.sub}`),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_REFRESH_SECRET: 'refresh-secret',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(UsersRepository) as jest.Mocked<UsersRepository>;
    tenantsRepository = module.get(TenantsRepository) as jest.Mocked<TenantsRepository>;
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock bcrypt
    (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid PIN', async () => {
      tenantsRepository.findBySlug.mockResolvedValue(mockTenant);
      usersRepository.findAll.mockResolvedValue([mockUser]);

      const result = await service.login({ tenantSlug: 'acme', pin: '1234' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.tenant.slug).toBe('acme');
    });

    it('should throw UnauthorizedException with invalid PIN', async () => {
      tenantsRepository.findBySlug.mockResolvedValue(mockTenant);
      usersRepository.findAll.mockResolvedValue([mockUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(service.login({ tenantSlug: 'acme', pin: 'wrong' })).rejects.toThrow('Invalid PIN');
    });
  });

  describe('registerDevice', () => {
    it('should register device successfully', async () => {
      const existingUser = { ...mockUser, deviceId: undefined };
      tenantsRepository.findBySlug.mockResolvedValue(mockTenant);
      usersRepository.findByDeviceId.mockResolvedValue(existingUser);
      usersRepository.update.mockResolvedValue({
        ...existingUser,
        deviceId: 'device-123',
        publicKey: 'public-key',
      });

      const result = await service.registerDevice({
        tenantSlug: 'acme',
        deviceId: 'device-123',
        publicKey: 'public-key',
      });

      expect(result.success).toBe(true);
      expect(usersRepository.update).toHaveBeenCalled();
    });
  });
});
