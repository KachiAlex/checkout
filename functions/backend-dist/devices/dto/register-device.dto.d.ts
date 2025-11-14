import { DeviceType } from '@pos-checkout/shared';
export declare class RegisterDeviceDto {
    identifier: string;
    name: string;
    type: DeviceType;
    hardwareId?: string;
    vendorId?: string;
    productId?: string;
    locationId?: string;
    registeredById?: string;
    metadata?: Record<string, unknown>;
    isActive?: boolean;
}
