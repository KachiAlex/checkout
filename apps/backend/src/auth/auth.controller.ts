import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { VerifyManagerDto } from './dto/verify-manager.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from '@pos-checkout/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(5, 900000) // 5 requests per 15 minutes (900 seconds = 900000 ms)
  @ApiOperation({ summary: 'Login with tenant slug and PIN' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('superadmin/login')
  @Throttle(5, 900000) // 5 requests per 15 minutes (900 seconds = 900000 ms)
  @ApiOperation({ summary: 'Super admin login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async superAdminLogin(@Body() loginDto: SuperAdminLoginDto) {
    return this.authService.loginSuperAdmin(loginDto);
  }

  @Post('verify-manager')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify manager PIN for price override authorization' })
  @ApiResponse({ status: 200, description: 'Manager PIN verified' })
  @ApiResponse({ status: 403, description: 'Invalid PIN or insufficient permissions' })
  async verifyManager(@Body() verifyDto: VerifyManagerDto, @Request() req: any) {
    const user = req.user;
    
    // Check if current user is already a manager/admin
    if (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN) {
      return { authorized: true, message: 'User is already authorized' };
    }

    // Verify manager PIN
    const manager = await this.authService.validateUser(verifyDto.pin, user.tenantId);
    
    if (!manager) {
      return { authorized: false, message: 'Invalid manager PIN' };
    }

    if (manager.role !== UserRole.MANAGER && manager.role !== UserRole.ADMIN) {
      return { authorized: false, message: 'PIN does not belong to a manager or admin' };
    }

    return {
      authorized: true,
      message: 'Manager authorization verified',
      authorizedBy: {
        id: manager.id,
        name: manager.name,
        role: manager.role,
      },
    };
  }

  @Post('refresh')
  @Throttle(10, 60000) // 10 requests per minute (60 seconds = 60000 ms)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }
}
