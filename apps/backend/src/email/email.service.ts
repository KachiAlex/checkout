import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || smtpUser;

    // If SMTP is not configured, use console logging (development mode)
    if (!smtpHost || !smtpUser || !smtpPassword) {
      this.logger.warn(
        'SMTP not configured. Email receipts will be logged to console. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to enable email sending.',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        // For development/testing with self-signed certificates
        tls: {
          rejectUnauthorized: this.configService.get<boolean>('SMTP_REJECT_UNAUTHORIZED', true),
        },
      });

      this.logger.log('Email service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER') || 'noreply@pos-checkout.com';

    // If transporter is not available, log to console (development mode)
    if (!this.transporter) {
      this.logger.log('Email (console mode):');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log('---');
      this.logger.log(options.text);
      if (options.html) {
        this.logger.log('--- HTML ---');
        this.logger.log(options.html);
      }
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: smtpFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br>'),
      });

      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}

