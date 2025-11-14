import { RegisterDeviceDto } from './register-device.dto';
declare const UpdateDeviceDto_base: import("@nestjs/common").Type<Partial<RegisterDeviceDto>>;
export declare class UpdateDeviceDto extends UpdateDeviceDto_base {
    lastUsedById?: string;
}
export {};
