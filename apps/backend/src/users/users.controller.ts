import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { ChangePinDto } from './dto/change-pin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users in the tenant' })
  async list(@Request() req: any) {
    return this.usersService.listUsers(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant user' })
  async create(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(req.user.tenantId, dto, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user in the tenant' })
  async update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(req.user.tenantId, id, dto, req.user);
  }

  @Patch(':id/reset-pin')
  @ApiOperation({ summary: 'Reset a user PIN' })
  async resetPin(@Param('id') id: string, @Request() req: any, @Body() body: { pin: string }) {
    await this.usersService.resetPin(req.user.tenantId, id, body.pin, req.user);
    return { success: true };
  }

  @Patch('me/change-pin')
  @ApiOperation({ summary: 'Change the authenticated user PIN' })
  async changePin(@Request() req: any, @Body() dto: ChangePinDto) {
    await this.usersService.changePin(req.user.sub, dto);
    return { success: true };
  }

  @Patch('me/location')
  @ApiOperation({ summary: 'Update the authenticated user location' })
  async updateMyLocation(@Request() req: any, @Body() body: { locationId?: string }) {
    await this.usersService.updateUser(req.user.tenantId, req.user.sub, { locationId: body.locationId }, req.user);
    return { success: true };
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user from the tenant' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.usersService.deleteUser(req.user.tenantId, id, req.user);
  }
}

