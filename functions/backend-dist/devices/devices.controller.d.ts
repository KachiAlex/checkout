import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    register(dto: RegisterDeviceDto, req: any): Promise<import("./devices.repository").DeviceRecord>;
    findAll(req: any, locationId?: string): Promise<import("./devices.repository").DeviceRecord[]>;
    update(id: string, dto: UpdateDeviceDto, req: any): Promise<import("./devices.repository").DeviceRecord>;
    heartbeat(id: string, dto: DeviceHeartbeatDto, req: any): Promise<import("./devices.repository").DeviceRecord>;
}
