import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
import { DevicesRepository, DeviceRecord } from './devices.repository';
export declare class DevicesService {
    private readonly devicesRepository;
    constructor(devicesRepository: DevicesRepository);
    private ensureSameTenant;
    registerDevice(dto: RegisterDeviceDto, tenantId: string, actorId?: string): Promise<DeviceRecord>;
    findAll(tenantId: string, locationId?: string): Promise<DeviceRecord[]>;
    updateDevice(id: string, tenantId: string, dto: UpdateDeviceDto): Promise<DeviceRecord>;
    recordHeartbeat(id: string, tenantId: string, dto: DeviceHeartbeatDto, actorId?: string): Promise<DeviceRecord>;
}
