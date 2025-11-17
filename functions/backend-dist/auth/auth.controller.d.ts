import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { VerifyManagerDto } from './dto/verify-manager.dto';
import { UserRole } from '@pos-checkout/shared';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<import("./dto/auth-response.dto").AuthResponseDto>;
    superAdminLogin(loginDto: SuperAdminLoginDto): Promise<import("./dto/auth-response.dto").AuthResponseDto>;
    verifyManager(verifyDto: VerifyManagerDto, req: any): Promise<{
        authorized: boolean;
        message: string;
        authorizedBy?: undefined;
    } | {
        authorized: boolean;
        message: string;
        authorizedBy: {
            id: string;
            name: string;
            role: UserRole.MANAGER | UserRole.ADMIN;
        };
    }>;
    refresh(body: {
        refreshToken: string;
    }): Promise<import("./dto/auth-response.dto").AuthResponseDto>;
}
