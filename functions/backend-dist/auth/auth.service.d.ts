import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { DeviceRegisterDto } from './dto/device-register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersRepository, UserRecord } from '../users/users.repository';
import { TenantsRepository } from '../tenants/tenants.repository';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
export declare class AuthService {
    private readonly usersRepository;
    private readonly tenantsRepository;
    private readonly jwtService;
    private readonly configService;
    constructor(usersRepository: UsersRepository, tenantsRepository: TenantsRepository, jwtService: JwtService, configService: ConfigService);
    validateUser(pin: string, tenantId: string, deviceId?: string): Promise<UserRecord | null>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    loginSuperAdmin(dto: SuperAdminLoginDto): Promise<AuthResponseDto>;
    registerDevice(dto: DeviceRegisterDto): Promise<{
        success: boolean;
        message: string;
    }>;
    refreshToken(refreshToken: string): Promise<AuthResponseDto>;
}
