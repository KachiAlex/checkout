import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@pos-checkout/shared';
export interface JwtPayload {
    sub: string;
    role: UserRole;
    locationId?: string;
    deviceId?: string;
    tenantId: string;
    isPlatformAdmin?: boolean;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    constructor(configService: ConfigService);
    validate(payload: JwtPayload): Promise<JwtPayload>;
}
export {};
