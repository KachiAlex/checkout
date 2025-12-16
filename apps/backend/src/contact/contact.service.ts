import { Injectable, Logger } from '@nestjs/common';
import { DemoRequestDto } from './dto/demo-request.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  async handleDemoRequest(dto: DemoRequestDto): Promise<{ success: boolean; message: string }> {
    try {
      // Log the demo request
      this.logger.log(`Demo request from ${dto.name} (${dto.email}) - ${dto.companyName}`);
      
      // In a production environment, you would integrate with an email service here
      // For now, we'll just log the request and return success
      // You can integrate with services like SendGrid, AWS SES, Mailgun, etc.
      
      this.logger.log(`Demo request details:`);
      this.logger.log(`  Name: ${dto.name}`);
      this.logger.log(`  Email: ${dto.email}`);
      this.logger.log(`  Phone: ${dto.phone || 'N/A'}`);
      this.logger.log(`  Company: ${dto.companyName}`);
      this.logger.log(`  Industry: ${dto.industry}`);
      this.logger.log(`  Message: ${dto.message || 'N/A'}`);
      this.logger.log(`  To: ${dto.recipientEmail}`);

      // TODO: Send actual email using your preferred email service
      // Example with SendGrid:
      // await this.sendGridService.send({
      //   to: dto.recipientEmail,
      //   from: 'noreply@checkout.com',
      //   subject: dto.subject,
      //   text: dto.content,
      //   html: dto.content.replace(/\n/g, '<br>'),
      // });

      return {
        success: true,
        message: 'Demo request received successfully. We will contact you soon!',
      };
    } catch (error) {
      this.logger.error('Failed to process demo request:', error);
      throw error;
    }
  }
}

