import { Injectable, Logger } from '@nestjs/common';
import { DemoRequestDto } from './dto/demo-request.dto';
import { SendGridService } from './sendgrid.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly sendGridService: SendGridService) {}

  async handleDemoRequest(dto: DemoRequestDto): Promise<{ success: boolean; message: string }> {
    try {
      // Log the demo request
      this.logger.log(`📧 Demo request from ${dto.name} (${dto.email}) - ${dto.companyName}`);

      // Send email via SendGrid
      await this.sendGridService.sendDemoRequestEmail({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        industry: dto.industry,
        message: dto.message,
        recipientEmail: dto.recipientEmail,
      });

      this.logger.log(`✅ Demo request email sent to ${dto.recipientEmail}`);

      return {
        success: true,
        message: 'Demo request received successfully. We will contact you soon!',
      };
    } catch (error) {
      this.logger.error('❌ Failed to process demo request:', error);
      throw error;
    }
  }
}
