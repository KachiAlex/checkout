import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface AppBootstrapOptions {
    enableSwagger?: boolean;
}
export declare function configureApp(app: INestApplication, options?: AppBootstrapOptions): Promise<{
    configService: ConfigService<unknown, boolean>;
}>;
