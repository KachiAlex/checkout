import { Injectable, NotFoundException } from '@nestjs/common';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
import { DevicesRepository, DeviceRecord } from './devices.repository';

@Injectable()
export class DevicesService {
  constructor(
    private readonly devicesRepository: DevicesRepository,
  ) {}

  private ensureSameTenant(device: DeviceRecord, tenantId: string) {
    if (device.tenantId !== tenantId) {
      throw new NotFoundException('Device not found in tenant');
    }
  }

  async registerDevice(dto: RegisterDeviceDto, tenantId: string, actorId?: string): Promise<DeviceRecord> {
    const normalizedIdentifier = dto.identifier.trim().toLowerCase();

    let device = await this.devicesRepository.findByIdentifier(tenantId, normalizedIdentifier);

    if (!device) {
      device = await this.devicesRepository.create({
        tenantId,
        identifier: normalizedIdentifier,
        name: dto.name,
        type: dto.type,
        hardwareId: dto.hardwareId,
        vendorId: dto.vendorId,
        productId: dto.productId,
        locationId: dto.locationId,
        registeredById: dto.registeredById ?? actorId,
        metadata: dto.metadata,
        isActive: dto.isActive ?? true,
        lastSeenAt: new Date(),
        lastUsedAt: dto.isActive ? new Date() : undefined,
        lastUsedById: actorId,
      });
    } else {
      this.ensureSameTenant(device, tenantId);
      device = await this.devicesRepository.update(device.id, {
        tenantId,
        name: dto.name ?? device.name,
        type: dto.type ?? device.type,
        hardwareId: dto.hardwareId ?? device.hardwareId,
        vendorId: dto.vendorId ?? device.vendorId,
        productId: dto.productId ?? device.productId,
        locationId: dto.locationId ?? device.locationId,
        metadata: dto.metadata ?? device.metadata,
        isActive: dto.isActive ?? device.isActive,
        lastSeenAt: new Date(),
        lastUsedAt: dto.isActive ? new Date() : device.lastUsedAt,
        lastUsedById: actorId ?? device.lastUsedById,
      });
    }

    return device;
  }

  async findAll(tenantId: string, locationId?: string): Promise<DeviceRecord[]> {
    return this.devicesRepository.findAll(tenantId, locationId);
  }

  async updateDevice(id: string, tenantId: string, dto: UpdateDeviceDto): Promise<DeviceRecord> {
    const device = await this.devicesRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    this.ensureSameTenant(device, tenantId);

    return this.devicesRepository.update(id, {
      tenantId,
      name: dto.name ?? device.name,
      type: dto.type ?? device.type,
      hardwareId: dto.hardwareId ?? device.hardwareId,
      vendorId: dto.vendorId ?? device.vendorId,
      productId: dto.productId ?? device.productId,
      locationId: dto.locationId ?? device.locationId,
      metadata: dto.metadata ?? device.metadata,
      isActive: dto.isActive ?? device.isActive,
      lastUsedById: dto.lastUsedById ?? device.lastUsedById,
      lastUsedAt: dto.lastUsedById ? new Date() : device.lastUsedAt,
      registeredById: dto.registeredById ?? device.registeredById,
    });
  }

  async recordHeartbeat(id: string, tenantId: string, dto: DeviceHeartbeatDto, actorId?: string): Promise<DeviceRecord> {
    const device = await this.devicesRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    this.ensureSameTenant(device, tenantId);

    return this.devicesRepository.update(id, {
      tenantId,
      lastSeenAt: new Date(),
      lastUsedAt: new Date(),
      lastUsedById: dto.userId ?? actorId ?? device.lastUsedById,
      isActive: dto.isActive ?? device.isActive,
    });
  }
}

