import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupRepository } from './backup.repository';
import { DatabaseModule } from '../database/database.module';
import { LicensingModule } from '../licensing/licensing.module';

@Module({
  imports: [DatabaseModule, LicensingModule],
  controllers: [BackupController],
  providers: [BackupService, BackupRepository],
  exports: [BackupService],
})
export class BackupModule {}
