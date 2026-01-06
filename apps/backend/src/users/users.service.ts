import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersRepository, UserRecord } from './users.repository';
import { ChangePinDto } from './dto/change-pin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@pos-checkout/shared';
import { LocationsRepository } from '../locations/locations.repository';

const hashPin = (pin: string) => bcrypt.hash(pin, 10);
const generatePin = () => Math.floor(Math.random() * 900000 + 100000).toString();

export type SafeUser = Omit<UserRecord, 'pinHash'>;

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  private ensureTenant(user: UserRecord | null, tenantId: string) {
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('User not found');
    }
  }

  private toSafeUser(user: UserRecord): SafeUser {
    const safeUser = { ...user };
    delete safeUser.pinHash;
    return safeUser as SafeUser;
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
    const locationId = await this.determineLocationIdForCreation(tenantId, dto.locationId, actor);

    const user = await this.usersRepository.save({
      name: dto.name.trim(),
      email: dto.email.toLowerCase(),
      role: dto.role,
      pinHash,
      tenantId,
      locationId,
      deviceId: undefined,
      isPlatformAdmin: dto.isPlatformAdmin ?? false,
    });

    return {
      user: this.toSafeUser(user),
      temporaryPin: dto.pin ? undefined : assignedPin,
    };
  }

  async updateUser(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
    actor: UserRecord,
  ): Promise<SafeUser> {
    const user = await this.usersRepository.findById(userId);
    this.ensureTenant(user, tenantId);

    // Only tenant admins or platform admins can update other users
    const isActorAdmin = actor.role === UserRole.ADMIN || actor.isPlatformAdmin;
    if (!isActorAdmin && actor.id !== userId) {
      throw new ForbiddenException('Only administrators can update other users');
    }

    if (dto.isPlatformAdmin !== undefined && !actor.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can modify platform permissions');
    }

    const update: Partial<UserRecord> = {};

    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.email !== undefined) update.email = dto.email.toLowerCase();
    if (dto.role !== undefined) update.role = dto.role;
    if (dto.locationId !== undefined) {
      update.locationId = await this.validateLocationOwnership(tenantId, dto.locationId);
    }
    if (dto.isPlatformAdmin !== undefined) update.isPlatformAdmin = dto.isPlatformAdmin;
    if (dto.pin !== undefined) {
      update.pinHash = await hashPin(dto.pin);
    }

    const updated = await this.usersRepository.update(userId, update);
    return this.toSafeUser(updated);
  }

  private async determineLocationIdForCreation(
    tenantId: string,
    requested?: string,
    actor?: UserRecord,
  ): Promise<string | undefined> {
    const normalized = await this.validateLocationOwnership(tenantId, requested);
    if (normalized) {
      return normalized;
    }

    if (actor?.locationId) {
      const actorLocation = await this.locationsRepository.findById(actor.locationId);
      if (actorLocation && (!actorLocation.tenantId || actorLocation.tenantId === tenantId)) {
        return actor.locationId;
      }
    }

    const tenantLocations = await this.locationsRepository.findByTenant(tenantId);
    return tenantLocations.length > 0 ? tenantLocations[0].id : undefined;
  }

  private async validateLocationOwnership(
    tenantId: string,
    locationId?: string | null,
  ): Promise<string | undefined> {
    if (!locationId?.trim()) {
      return undefined;
    }

    const location = await this.locationsRepository.findById(locationId.trim());
    if (!location || (location.tenantId && location.tenantId !== tenantId)) {
      throw new NotFoundException('Location not found');
    }

    return location.id;
  }

  async deleteUser(tenantId: string, userId: string, actor: UserRecord): Promise<void> {
    const isActorAdmin = actor.role === UserRole.ADMIN || actor.isPlatformAdmin;
    if (!isActorAdmin) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    if (actor.id === userId) {
      throw new ForbiddenException('You cannot delete your own user');
    }

    const user = await this.usersRepository.findById(userId);
    this.ensureTenant(user, tenantId);

    await this.usersRepository.delete(userId);
  }

  async resetPin(
    tenantId: string,
    userId: string,
    newPin: string,
    actor: UserRecord,
  ): Promise<void> {
    if (actor.role !== UserRole.ADMIN && !actor.isPlatformAdmin) {
      throw new ForbiddenException('Only admins can reset PINs');
    }

    const user = await this.usersRepository.findById(userId);
    this.ensureTenant(user, tenantId);

    const pinHash = await hashPin(newPin);
    await this.usersRepository.update(userId, { pinHash });
  }
}
