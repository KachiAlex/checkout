import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository, UserRecord } from './users.repository';
import { ChangePinDto } from './dto/change-pin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@pos-checkout/shared';

const hashPin = (pin: string) => bcrypt.hash(pin, 10);
const generatePin = () => Math.floor(Math.random() * 900000 + 100000).toString();

export type SafeUser = Omit<UserRecord, 'pinHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  private ensureTenant(user: UserRecord | null, tenantId: string) {
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('User not found');
    }
  }

  private toSafeUser(user: UserRecord): SafeUser {
    const { pinHash, ...rest } = user;
    return rest;
  }

  async changePin(userId: string, dto: ChangePinDto): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPin, user.pinHash);
    if (!isValid) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    const newHash = await hashPin(dto.newPin);
    await this.usersRepository.update(userId, {
      pinHash: newHash,
    });
  }

  async listUsers(tenantId: string): Promise<SafeUser[]> {
    const users = await this.usersRepository.findAll(tenantId);
    return users.map((user) => this.toSafeUser(user));
  }

  async createUser(
    tenantId: string,
    dto: CreateUserDto,
    actor: UserRecord,
  ): Promise<{ user: SafeUser; temporaryPin?: string }> {
    if (dto.isPlatformAdmin && !actor.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can grant platform permissions');
    }

    if (actor.role !== UserRole.ADMIN && !actor.isPlatformAdmin) {
      throw new ForbiddenException('Only tenant administrators can create users');
    }

    const assignedPin = dto.pin ?? generatePin();
    const pinHash = await hashPin(assignedPin);

    const user = await this.usersRepository.save({
      name: dto.name.trim(),
      email: dto.email.toLowerCase(),
      role: dto.role,
      pinHash,
      tenantId,
      locationId: dto.locationId,
      deviceId: undefined,
      isPlatformAdmin: dto.isPlatformAdmin ?? false,
    });

    return {
      user: this.toSafeUser(user),
      temporaryPin: dto.pin ? undefined : assignedPin,
    };
  }

  async updateUser(tenantId: string, userId: string, dto: UpdateUserDto, actor: UserRecord): Promise<SafeUser> {
    const user = await this.usersRepository.findById(userId);
    this.ensureTenant(user, tenantId);

    if (dto.isPlatformAdmin !== undefined && !actor.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can modify platform permissions');
    }

    const update: Partial<UserRecord> = {};

    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.email !== undefined) update.email = dto.email.toLowerCase();
    if (dto.role !== undefined) update.role = dto.role;
    if (dto.locationId !== undefined) update.locationId = dto.locationId;
    if (dto.isPlatformAdmin !== undefined) update.isPlatformAdmin = dto.isPlatformAdmin;
    if (dto.pin !== undefined) {
      update.pinHash = await hashPin(dto.pin);
    }

    const updated = await this.usersRepository.update(userId, update);
    return this.toSafeUser(updated);
  }

  async resetPin(tenantId: string, userId: string, newPin: string, actor: UserRecord): Promise<void> {
    if (actor.role !== UserRole.ADMIN && !actor.isPlatformAdmin) {
      throw new ForbiddenException('Only admins can reset PINs');
    }

    const user = await this.usersRepository.findById(userId);
    this.ensureTenant(user, tenantId);

    const pinHash = await hashPin(newPin);
    await this.usersRepository.update(userId, { pinHash });
  }
}

