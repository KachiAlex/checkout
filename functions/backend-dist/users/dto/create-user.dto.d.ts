import { UserRole } from '@pos-checkout/shared';
export declare class CreateUserDto {
    name: string;
    email: string;
    role: UserRole;
    pin?: string;
    locationId?: string;
    isPlatformAdmin?: boolean;
}
