import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { DeviceRegisterDto } from './dto/device-register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    superAdminLogin(dto: SuperAdminLoginDto): Promise<AuthResponseDto>;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto>;
    registerDevice(deviceRegisterDto: DeviceRegisterDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
