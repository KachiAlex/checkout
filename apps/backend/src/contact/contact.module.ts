import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { SendGridService } from './sendgrid.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, SendGridService],
  exports: [ContactService, SendGridService],
})
export class ContactModule {}
