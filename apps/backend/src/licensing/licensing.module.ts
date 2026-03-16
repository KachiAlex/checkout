import { Module } from '@nestjs/common';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';
import { LicensingRepository } from './licensing.repository';
import { LicenseKeyGeneratorService } from './services/license-key-generator.service';
import { LicenseValidatorService } from './services/license-validator.service';
import { LicenseCryptoService } from './services/license-crypto.service';
import { HardwareFingerprintService } from './services/hardware-fingerprint.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LicensingController],
  providers: [
    LicensingService,
    LicensingRepository,
    LicenseKeyGeneratorService,
    LicenseValidatorService,
    LicenseCryptoService,
    HardwareFingerprintService,
  ],
  exports: [LicensingService, LicenseValidatorService, LicenseCryptoService, LicensingRepository],
})
export class LicensingModule {}
