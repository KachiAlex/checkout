import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DemoRequestDto } from './dto/demo-request.dto';
import { SupportRequestDto } from './dto/support-request.dto';
import { SendGridService } from './sendgrid.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly sendGridService: SendGridService,
    private readonly configService: ConfigService,
  ) {}

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

  async handleSupportRequest(
    dto: SupportRequestDto,
    actor: {
      tenantId: string;
      actorId: string;
      actorRole?: string;
      locationId?: string;
      deviceId?: string;
      actorName?: string;
      actorEmail?: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    const supportInbox =
      this.configService.get<string>('SUPPORT_INBOX_EMAIL') ||
      this.configService.get<string>('CONTACT_INBOX_EMAIL') ||
      this.configService.get<string>('SENDGRID_SUPPORT_INBOX') ||
      '';

    if (!supportInbox) {
      this.logger.warn('⚠️ Support inbox email is not configured (SUPPORT_INBOX_EMAIL)');
    }

    try {
      this.logger.log(
        `📨 Support request from tenant=${actor.tenantId} user=${actor.actorId} subject=${dto.subject}`,
      );

      const subject = `[Support] ${dto.subject}`;
      const text = [
        'New Support Request',
        '',
        `Tenant: ${actor.tenantId}`,
        `User: ${actor.actorId}${actor.actorName ? ` (${actor.actorName})` : ''}`,
        `Role: ${actor.actorRole || 'unknown'}`,
        `Location: ${actor.locationId || 'n/a'}`,
        `Device: ${actor.deviceId || 'n/a'}`,
        `Module: ${dto.module || 'n/a'}`,
        '',
        'Message:',
        dto.message,
      ].join('\n');

      const html = `
        <h2>New Support Request</h2>
        <p><strong>Tenant:</strong> ${actor.tenantId}</p>
        <p><strong>User:</strong> ${actor.actorId}${actor.actorName ? ` (${actor.actorName})` : ''}</p>
        <p><strong>Role:</strong> ${actor.actorRole || 'unknown'}</p>
        <p><strong>Location:</strong> ${actor.locationId || 'n/a'}</p>
        <p><strong>Device:</strong> ${actor.deviceId || 'n/a'}</p>
        <p><strong>Module:</strong> ${dto.module || 'n/a'}</p>
        <hr />
        <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${dto.message.replace(
          /</g,
          '&lt;',
        )}</pre>
      `.trim();

      await this.sendGridService.sendEmail({
        to: supportInbox || this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@checkout.com',
        subject,
        text,
        html,
        replyTo: actor.actorEmail,
      });

      return {
        success: true,
        message: 'Your request has been sent. Support will contact you soon.',
      };
    } catch (error) {
      this.logger.error('❌ Failed to process support request:', error);
      throw error;
    }
  }
}
