import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { TenantsService } from '../tenants/tenants.service';
import { TenantsRepository } from '../tenants/tenants.repository';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './dto/register.dto';
import {
  TenantPlan,
  TenantStatus,
  PaymentMethod,
  PaymentStatus,
  Industry,
} from '@pos-checkout/shared';
import { FlutterwaveAdapter } from '@pos-checkout/payment-adapters';
import type { FlutterwaveConfig } from '@pos-checkout/payment-adapters';
import { v4 as uuidv4 } from 'uuid';
import {
  SubscriptionPaymentsRepository,
  SubscriptionPaymentRecord,
} from './subscription-payments.repository';
import { EmailService } from '../email/email.service';
import { PlatformWebhookDto } from './dto/platform-webhook.dto';
import { RegistrationException } from './exceptions/registration.exception';

@Injectable()
export class PlatformService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantsRepository: TenantsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly subscriptionPaymentsRepository: SubscriptionPaymentsRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new tenant with optional plan selection
   * For paid plans, initiates payment flow
   * For free plan, creates tenant immediately with 14-day trial
   */
  async registerTenant(dto: RegisterDto): Promise<{
    success: boolean;
    message: string;
    tenant: {
      id: string;
      slug: string;
      plan: TenantPlan;
      status: TenantStatus;
    };
    requiresPayment?: boolean;
    paymentId?: string;
    checkoutUrl?: string;
  }> {
    // Validate company slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(dto.companySlug.toLowerCase())) {
      throw new RegistrationException({
        code: 'INVALID_SLUG_FORMAT',
        message: 'Company URL must contain only lowercase letters, numbers, and hyphens',
        field: 'companySlug',
        details: 'Slug format: lowercase letters, numbers, and hyphens only',
      });
    }

    // Check if slug already exists
    const existing = await this.tenantsRepository.findBySlug(dto.companySlug.toLowerCase());
    if (existing) {
      throw new RegistrationException({
        code: 'DUPLICATE_SLUG',
        message: 'Company URL is already taken. Please choose a different one.',
        field: 'companySlug',
        details: 'This slug is already registered in the system',
      });
    }

    // Check if email already exists
    const existingEmail = await this.usersRepository.findByEmail(dto.adminEmail.toLowerCase());
    if (existingEmail) {
      throw new RegistrationException({
        code: 'DUPLICATE_EMAIL',
        message: 'Email address is already registered. Please use a different email.',
        field: 'adminEmail',
        details: 'This email is already associated with an existing account',
      });
    }

    // Determine plan - default to FREE (trial) if not specified
    const plan = dto.plan || TenantPlan.FREE;

    // Calculate billing dates
    const billingCycleStart = new Date();
    let billingCycleEnd: Date | undefined;

    // For free trial, set end date to 14 days from now
    if (plan === TenantPlan.FREE) {
      billingCycleEnd = new Date();
      billingCycleEnd.setDate(billingCycleEnd.getDate() + 14);
    } else {
      // For paid plans, set to 30 days from now (monthly) or 365 days (annual)
      billingCycleEnd = new Date();
      if (
        plan === TenantPlan.STARTER ||
        plan === TenantPlan.PROFESSIONAL ||
        plan === TenantPlan.ENTERPRISE
      ) {
        billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);
      } else if (plan === TenantPlan.LIFETIME) {
        billingCycleEnd = undefined; // Lifetime has no end date
      }
    }

    // Create tenant using TenantsService
    // Note: TenantsService.create expects CreateTenantDto which doesn't include password
    // We'll need to create the tenant and then set the password separately
    const result = await this.tenantsService.create({
      name: dto.companyName,
      slug: dto.companySlug.toLowerCase(),
      plan,
      adminEmail: dto.adminEmail,
      adminName: dto.adminName,
      industry: this.normalizeIndustry(dto.industry),
      billingCycleStart: billingCycleStart.toISOString(),
      billingCycleEnd: billingCycleEnd?.toISOString(),
    });

    // Update admin user password (stored as PIN hash)
    const adminUser = await this.usersRepository.findById(result.admin.id);
    if (adminUser) {
      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      await this.usersRepository.update(result.admin.id, {
        pinHash: passwordHash, // Store password hash in pinHash field (system uses PINs for login)
      });
    }

    // If plan is paid, initiate payment
    if (plan !== TenantPlan.FREE) {
      const pricing = this.getPlanPricing(plan);

      if (pricing.priceCents > 0) {
        // Create payment record
        const paymentId = uuidv4();
        await this.subscriptionPaymentsRepository.create({
          id: paymentId,
          tenantId: result.tenant.id,
          tenantSlug: result.tenant.slug,
          plan,
          amountCents: pricing.priceCents,
          currency: 'NGN',
          status: PaymentStatus.PROCESSING,
          metadata: {
            source: 'platform_register',
            adminEmail: dto.adminEmail,
          },
        });

        // Initiate payment with Flutterwave
        try {
          const flutterwaveAdapter = this.getFlutterwaveAdapter();
          const paymentResult = await flutterwaveAdapter.initiatePayment({
            order_id: paymentId,
            amount_cents: pricing.priceCents,
            currency: 'NGN',
            method: PaymentMethod.CARD,
            metadata: {
              tenantId: result.tenant.id,
              tenantSlug: result.tenant.slug,
              plan,
              customerName: dto.adminName,
              customerEmail: dto.adminEmail,
              redirectUrl: `${this.getFrontendUrl()}/subscription/payment-callback?tenantId=${result.tenant.id}&paymentId=${paymentId}`,
            },
          });

          const checkoutUrl = this.getProcessorCheckoutUrl(paymentResult.processor_data);
          const updatedPayment = await this.subscriptionPaymentsRepository.update(paymentId, {
            status: paymentResult.status,
            transactionId: paymentResult.transaction_id,
            checkoutUrl,
            processorData: paymentResult.processor_data,
          });
          if (updatedPayment.status === PaymentStatus.COMPLETED) {
            await this.sendSubscriptionReceipt(updatedPayment);
          }

          if (checkoutUrl) {
            return {
              success: true,
              message:
                'Registration successful. Please complete payment to activate your subscription.',
              tenant: {
                id: result.tenant.id,
                slug: result.tenant.slug,
                plan,
                status: TenantStatus.PENDING,
              },
              requiresPayment: true,
              paymentId,
              checkoutUrl,
            };
          }
        } catch (error) {
          await this.subscriptionPaymentsRepository.update(paymentId, {
            status: PaymentStatus.FAILED,
          });
          console.error('[Platform Registration] Failed to initiate payment:', {
            error: error.message,
            stack: error.stack,
            tenantId: result.tenant.id,
            plan,
            timestamp: new Date().toISOString(),
          });
          throw new RegistrationException({
            code: 'PAYMENT_INITIATION_FAILED',
            message: 'Failed to initiate payment. Please try again.',
            details: error.message,
          });
        }
      }
    }

    // For free plan or if payment initiation failed
    // Send welcome email to admin user
    try {
      await this.sendWelcomeEmail({
        adminName: dto.adminName,
        adminEmail: dto.adminEmail,
        companyName: dto.companyName,
        tenantSlug: result.tenant.slug,
        plan,
      });
    } catch (error) {
      console.error('[Platform Registration] Failed to send welcome email:', {
        error: error.message,
        adminEmail: dto.adminEmail,
        tenantSlug: result.tenant.slug,
        timestamp: new Date().toISOString(),
      });
      // Don't throw - email failure shouldn't block registration
    }

    return {
      success: true,
      message:
        plan === TenantPlan.FREE
          ? 'Registration successful! Your 14-day free trial has started.'
          : 'Registration successful!',
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        plan,
        status: result.tenant.status,
      },
    };
  }

  /**
   * Get payment status for a subscription
   */
  async getPaymentStatus(
    tenantId: string,
    paymentId: string,
  ): Promise<{
    status: PaymentStatus;
    tenantSlug?: string;
  }> {
    const payment = await this.subscriptionPaymentsRepository.findById(paymentId);

    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException('Payment not found');
    }

    // Check with Flutterwave if payment is still processing
    if (payment.status === PaymentStatus.PROCESSING && payment.transactionId) {
      try {
        const flutterwaveAdapter = this.getFlutterwaveAdapter();
        const status = await flutterwaveAdapter.getStatus(payment.transactionId);

        if (status === PaymentStatus.COMPLETED) {
          // Payment completed, activate subscription if not already done
          if (payment.status === PaymentStatus.PROCESSING) {
            await this.activateSubscription(payment);
            const updatedPayment = await this.subscriptionPaymentsRepository.update(paymentId, {
              status: PaymentStatus.COMPLETED,
              paidAt: new Date(),
            });
            await this.sendSubscriptionReceipt(updatedPayment);
          }
        } else if (status === PaymentStatus.FAILED) {
          await this.subscriptionPaymentsRepository.update(paymentId, {
            status: PaymentStatus.FAILED,
            paidAt: null,
          });
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
      }
    }

    return {
      status: payment.status,
      tenantSlug: payment.tenantSlug,
    };
  }

  /**
   * Handle Flutterwave webhook for payment confirmation
   */
  async handleFlutterwaveWebhook(
    payload: PlatformWebhookDto,
    verifHash: string,
  ): Promise<{ success: boolean }> {
    // Verify webhook signature
    const adapter = this.getFlutterwaveAdapter();
    const webhookSecret = this.configService.get<string>('FLUTTERWAVE_WEBHOOK_SECRET');

    if (webhookSecret) {
      if (!verifHash) {
        throw new BadRequestException('Missing webhook signature');
      }
      const payloadString = JSON.stringify(payload);
      const isValid = adapter.verifyWebhookSignature(payloadString, verifHash);
      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Process webhook based on event type
    const event = payload.event;

    if (event === 'charge.completed') {
      const txRef = payload.data.tx_ref;
      const status = payload.data.status;

      const payment = await this.subscriptionPaymentsRepository.findByTransactionId(txRef);

      if (!payment) {
        console.warn('Payment not found for webhook:', txRef);
        return { success: false };
      }

      if (status === 'successful' && payment.status !== PaymentStatus.COMPLETED) {
        // Activate subscription
        await this.activateSubscription(payment);
        const updatedPayment = await this.subscriptionPaymentsRepository.update(payment.id, {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        });
        await this.sendSubscriptionReceipt(updatedPayment);
      }
    }

    return { success: true };
  }

  /**
   * Activate tenant subscription after payment
   */
  private async activateSubscription(payment: SubscriptionPaymentRecord): Promise<void> {
    const pricing = this.getPlanPricing(payment.plan);
    const billingCycleStart = new Date();
    let billingCycleEnd: Date | undefined;

    // Calculate billing cycle end based on plan
    if (payment.plan === TenantPlan.LIFETIME) {
      billingCycleEnd = undefined; // Lifetime has no end date
    } else {
      billingCycleEnd = new Date(billingCycleStart);
      billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1); // Monthly
    }

    // Update tenant
    await this.tenantsRepository.update(payment.tenantId, {
      plan: payment.plan,
      status: TenantStatus.ACTIVE,
      billingCycleStart: billingCycleStart,
      billingCycleEnd: billingCycleEnd,
      seatLimit: pricing.users,
    });
  }

  /**
   * Normalize industry string to supported enum.
   */
  private normalizeIndustry(value?: string): Industry {
    if (!value) {
      return Industry.GENERAL;
    }
    const normalized = value.trim().toLowerCase();
    const match = (Object.values(Industry) as string[]).find((industry) => industry === normalized);
    return (match as Industry) ?? Industry.GENERAL;
  }

  /**
   * Extract Checkout URL from processor data.
   */
  private getProcessorCheckoutUrl(processorData?: Record<string, unknown>): string | undefined {
    if (!processorData) {
      return undefined;
    }
    const checkoutUrl = processorData.checkout_url ?? processorData.link;
    return typeof checkoutUrl === 'string' ? checkoutUrl : undefined;
  }

  private getMetadataString(
    metadata: Record<string, unknown> | undefined,
    key: string,
  ): string | undefined {
    if (!metadata) {
      return undefined;
    }
    const value = metadata[key];
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Get Flutterwave adapter instance
   */
  private getFlutterwaveAdapter(): FlutterwaveAdapter {
    const config: FlutterwaveConfig = {
      publicKey: this.configService.get<string>('FLUTTERWAVE_PUBLIC_KEY') || '',
      secretKey: this.configService.get<string>('FLUTTERWAVE_SECRET_KEY') || '',
      webhookSecret: this.configService.get<string>('FLUTTERWAVE_WEBHOOK_SECRET'),
      baseUrl: this.configService.get<string>('FLUTTERWAVE_BASE_URL'),
    };

    if (!config.publicKey || !config.secretKey) {
      throw new InternalServerErrorException('Flutterwave is not configured');
    }

    return new FlutterwaveAdapter(config);
  }

  /**
   * Get frontend URL from config
   */
  private getFrontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'https://checkout-77d99.web.app';
  }

  /**
   * Get pricing for a plan
   */
  private getPlanPricing(plan: TenantPlan): { priceCents: number; users: number } {
    // These should ideally come from a pricing service or database
    const pricing = {
      [TenantPlan.FREE]: { priceCents: 0, users: 3 },
      [TenantPlan.STARTER]: { priceCents: 2000000, users: 10 }, // $200/mo = 200,000 NGN
      [TenantPlan.PROFESSIONAL]: { priceCents: 5000000, users: 50 }, // $500/mo = 500,000 NGN
      [TenantPlan.ENTERPRISE]: { priceCents: 10000000, users: 999 }, // $1000/mo = 1,000,000 NGN
      [TenantPlan.LIFETIME]: { priceCents: 50000000, users: 999 }, // $5000 = 5,000,000 NGN
      [TenantPlan.MONTHLY]: { priceCents: 2000000, users: 10 },
      [TenantPlan.ANNUAL]: { priceCents: 20000000, users: 10 },
    };

    return pricing[plan] || pricing[TenantPlan.FREE];
  }

  /**
   * Send welcome email to newly registered admin user
   */
  private async sendWelcomeEmail(data: {
    adminName: string;
    adminEmail: string;
    companyName: string;
    tenantSlug: string;
    plan: TenantPlan;
  }): Promise<void> {
    try {
      const frontendUrl = this.getFrontendUrl();
      const loginUrl = `${frontendUrl}/login?tenantSlug=${data.tenantSlug}`;
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      const trialEndDateStr = trialEndDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const subject = `Welcome to Checkout - Your ${data.plan === TenantPlan.FREE ? '14-Day Free Trial' : data.plan} Plan`;

      const bodyLines = [
        `Hello ${data.adminName},`,
        '',
        `Welcome to Checkout! Your ${data.plan === TenantPlan.FREE ? '14-day free trial' : data.plan} account for ${data.companyName} has been successfully created.`,
        '',
        'Account Details:',
        `Company: ${data.companyName}`,
        `Tenant URL: ${data.tenantSlug}`,
        `Plan: ${data.plan}`,
        data.plan === TenantPlan.FREE ? `Trial Ends: ${trialEndDateStr}` : '',
        '',
        'Getting Started:',
        `1. Visit: ${loginUrl}`,
        `2. Log in with your email: ${data.adminEmail}`,
        '3. Set up your first products and start accepting payments',
        '',
        'Need Help?',
        'Check out our documentation or reply to this email if you have any questions.',
        '',
        'Happy selling!',
        '— The Checkout Team',
      ].filter(Boolean);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Checkout, ${data.adminName}!</h2>
          
          <p>Your ${data.plan === TenantPlan.FREE ? '14-day free trial' : data.plan} account for <strong>${data.companyName}</strong> has been successfully created.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Account Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 120px;">Company:</td>
                <td style="padding: 8px;">${data.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Tenant URL:</td>
                <td style="padding: 8px;"><code>${data.tenantSlug}</code></td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Plan:</td>
                <td style="padding: 8px;">${data.plan}</td>
              </tr>
              ${
                data.plan === TenantPlan.FREE
                  ? `<tr>
                <td style="padding: 8px; font-weight: bold;">Trial Ends:</td>
                <td style="padding: 8px;">${trialEndDateStr}</td>
              </tr>`
                  : ''
              }
            </table>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Getting Started</h3>
            <ol>
              <li><a href="${loginUrl}" style="color: #0066cc;">Click here to log in</a></li>
              <li>Use your email: <code>${data.adminEmail}</code></li>
              <li>Set up your first products and start accepting payments</li>
            </ol>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Need Help?</strong> Check out our documentation or reply to this email if you have any questions.</p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Happy selling!<br>
            — The Checkout Team
          </p>
        </div>
      `;

      await this.emailService.sendEmail({
        to: data.adminEmail,
        subject,
        text: bodyLines.join('\n'),
        html,
      });

      console.log('[Platform Registration] Welcome email sent successfully:', {
        adminEmail: data.adminEmail,
        tenantSlug: data.tenantSlug,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Platform Registration] Error sending welcome email:', {
        error: error.message,
        stack: error.stack,
        adminEmail: data.adminEmail,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private async sendSubscriptionReceipt(payment: SubscriptionPaymentRecord): Promise<void> {
    try {
      const tenant = await this.tenantsRepository.findById(payment.tenantId);
      const metadataAdminEmail = this.getMetadataString(payment.metadata, 'adminEmail');
      const recipient = tenant?.contactEmail || metadataAdminEmail;
      if (!recipient) {
        return;
      }

      const amount = (payment.amountCents / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const paidAt = (payment.paidAt ?? new Date()).toLocaleString();
      const subject = `Payment receipt - ${tenant?.name ?? 'POS Checkout'} (${payment.plan})`;
      const bodyLines = [
        `Hello ${tenant?.name ?? 'there'},`,
        '',
        'Thanks for subscribing to Checkout!',
        '',
        `Plan: ${payment.plan}`,
        `Amount: ${payment.currency || 'NGN'} ${amount}`,
        `Payment ID: ${payment.id}`,
        `Transaction ID: ${payment.transactionId ?? 'N/A'}`,
        `Paid at: ${paidAt}`,
        '',
        'You now have full access to the selected plan. If you have any questions, please reply to this email.',
        '',
        '— Checkout Platform Team',
      ];

      const html = `
        <p>Hello ${tenant?.name ?? 'there'},</p>
        <p>Thanks for subscribing to Checkout!</p>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 8px;"><strong>Plan</strong></td><td style="padding:4px 8px;">${payment.plan}</td></tr>
          <tr><td style="padding:4px 8px;"><strong>Amount</strong></td><td style="padding:4px 8px;">${
            payment.currency || 'NGN'
          } ${amount}</td></tr>
          <tr><td style="padding:4px 8px;"><strong>Payment ID</strong></td><td style="padding:4px 8px;">${
            payment.id
          }</td></tr>
          ${
            payment.transactionId
              ? `<tr><td style="padding:4px 8px;"><strong>Transaction ID</strong></td><td style="padding:4px 8px;">${payment.transactionId}</td></tr>`
              : ''
          }
          <tr><td style="padding:4px 8px;"><strong>Paid at</strong></td><td style="padding:4px 8px;">${paidAt}</td></tr>
        </table>
        <p>You now have full access to the selected plan. If you have any questions, please reply to this email.</p>
        <p>— Checkout Platform Team</p>
      `;

      await this.emailService.sendEmail({
        to: recipient,
        subject,
        text: bodyLines.join('\n'),
        html,
      });
    } catch (error) {
      console.error('Failed to send subscription receipt email:', error);
    }
  }
}
