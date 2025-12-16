import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);
  private readonly fromEmail: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@checkout.com';
    
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      this.logger.log('✅ SendGrid configured successfully');
    } else {
      this.isConfigured = false;
      this.logger.warn('⚠️ SendGrid API key not found. Email sending will be simulated.');
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('SendGrid not configured. Email simulation:');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`From: ${options.from || this.fromEmail}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Body: ${options.text}`);
      return true;
    }

    try {
      const msg = {
        to: options.to,
        from: options.from || this.fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
      };

      await sgMail.send(msg);
      this.logger.log(`✅ Email sent successfully to ${options.to}`);
      return true;
    } catch (error: any) {
      this.logger.error('❌ Failed to send email via SendGrid:', error);
      
      if (error.response) {
        this.logger.error('SendGrid error response:', {
          statusCode: error.response.statusCode,
          body: error.response.body,
        });
      }
      
      throw error;
    }
  }

  async sendDemoRequestEmail(data: {
    name: string;
    email: string;
    phone?: string;
    companyName: string;
    industry: string;
    message?: string;
    recipientEmail: string;
  }): Promise<boolean> {
    const subject = `Demo Request from ${data.name} - ${data.companyName}`;
    
    const textContent = `
New Demo Request

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}
Company: ${data.companyName}
Industry: ${data.industry}

Message:
${data.message || 'No additional message'}

---
This email was sent from the Checkout POS Demo Request Form.
Reply to this email to contact ${data.name} directly.
    `.trim();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Demo Request</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%);
              color: white;
              padding: 30px 20px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f9fafb;
              padding: 30px 20px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .field {
              margin-bottom: 20px;
            }
            .field-label {
              font-weight: 600;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            .field-value {
              color: #111827;
              font-size: 16px;
            }
            .message-box {
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              margin-top: 10px;
            }
            .footer {
              background: #111827;
              color: #9ca3af;
              padding: 20px;
              border-radius: 0 0 10px 10px;
              text-align: center;
              font-size: 12px;
            }
            .footer a {
              color: #0ea5e9;
              text-decoration: none;
            }
            .badge {
              display: inline-block;
              background: #dbeafe;
              color: #1e40af;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 New Demo Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone wants to see Checkout POS in action!</p>
          </div>
          
          <div class="content">
            <div class="field">
              <div class="field-label">Full Name</div>
              <div class="field-value">${data.name}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Email Address</div>
              <div class="field-value">
                <a href="mailto:${data.email}" style="color: #0ea5e9; text-decoration: none;">${data.email}</a>
              </div>
            </div>
            
            <div class="field">
              <div class="field-label">Phone Number</div>
              <div class="field-value">${data.phone || 'Not provided'}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Company Name</div>
              <div class="field-value">${data.companyName}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Industry</div>
              <div class="field-value">
                <span class="badge">${data.industry.charAt(0).toUpperCase() + data.industry.slice(1)}</span>
              </div>
            </div>
            
            ${data.message ? `
              <div class="field">
                <div class="field-label">Additional Information</div>
                <div class="message-box">${data.message.replace(/\n/g, '<br>')}</div>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p style="margin: 0 0 10px 0;">This email was sent from the Checkout POS Demo Request Form</p>
            <p style="margin: 0;">
              Reply to this email to contact <strong style="color: white;">${data.name}</strong> directly
            </p>
          </div>
        </body>
      </html>
    `.trim();

    return this.sendEmail({
      to: data.recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
      replyTo: data.email, // Set reply-to as the requester's email
    });
  }
}

