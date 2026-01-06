import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { ChangePinDto } from './dto/change-pin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface AuthenticatedUser {
  tenantId: string;
  sub: string;
  role?: string;
  isPlatformAdmin?: boolean;
}

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@ApiTags('users')
@Controller('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users in the tenant' })
  async list(@Req() req: AuthenticatedRequest) {
    return this.usersService.listUsers(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant user' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(req.user.tenantId, dto, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user in the tenant' })
  async update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(req.user.tenantId, id, dto, req.user);
  }

  @Patch(':id/reset-pin')
  @ApiOperation({ summary: 'Reset a user PIN' })
  async resetPin(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { pin: string },
  ) {
    await this.usersService.resetPin(req.user.tenantId, id, body.pin, req.user);
    return { success: true };
  }

  @Patch('me/change-pin')
  @ApiOperation({ summary: 'Change the authenticated user PIN' })
  async changePin(@Req() req: AuthenticatedRequest, @Body() dto: ChangePinDto) {
    await this.usersService.changePin(req.user.sub, dto);
    return { success: true };
  }

  @Patch('me/location')
  @ApiOperation({ summary: 'Update the authenticated user location' })
  async updateMyLocation(@Req() req: AuthenticatedRequest, @Body() body: { locationId?: string }) {
    await this.usersService.updateUser(
      req.user.tenantId,
      req.user.sub,
      { locationId: body.locationId },
      req.user,
    );
    return { success: true };
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user from the tenant' })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.usersService.deleteUser(req.user.tenantId, id, req.user);
  }
}
