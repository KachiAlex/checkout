import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { TenantsService } from '../tenants/tenants.service';
import { TenantsRepository } from '../tenants/tenants.repository';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './dto/register.dto';
import { TenantPlan, TenantStatus, PaymentMethod, PaymentStatus } from '@pos-checkout/shared';
import { FlutterwaveAdapter } from '@pos-checkout/payment-adapters';
import type { FlutterwaveConfig } from '@pos-checkout/payment-adapters';
import { v4 as uuidv4 } from 'uuid';

interface SubscriptionPayment {
  id: string;
  tenantId: string;
  tenantSlug: string;
  plan: TenantPlan;
  amountCents: number;
  status: PaymentStatus;
  transactionId?: string;
  checkoutUrl?: string;
  processorData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for subscription payments
// In production, consider storing in Firestore or a dedicated payments collection
const subscriptionPayments = new Map<string, SubscriptionPayment>();

@Injectable()
export class PlatformService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantsRepository: TenantsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
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
    // Check if slug already exists
    const existing = await this.tenantsRepository.findBySlug(dto.companySlug.toLowerCase());
    if (existing) {
      throw new BadRequestException('Company URL is already taken. Please choose a different one.');
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
      if (plan === TenantPlan.STARTER || plan === TenantPlan.PROFESSIONAL || plan === TenantPlan.ENTERPRISE) {
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
      industry: dto.industry as any, // Industry type from registration
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
        const payment: SubscriptionPayment = {
          id: paymentId,
          tenantId: result.tenant.id,
          tenantSlug: result.tenant.slug,
          plan,
          amountCents: pricing.priceCents,
          status: PaymentStatus.PROCESSING,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

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

          payment.status = paymentResult.status;
          payment.transactionId = paymentResult.transaction_id;
          payment.checkoutUrl = (paymentResult.processor_data as any)?.checkout_url;
          payment.processorData = paymentResult.processor_data;
          payment.updatedAt = new Date();

          subscriptionPayments.set(paymentId, payment);

          if (payment.checkoutUrl) {
            return {
              success: true,
              message: 'Registration successful. Please complete payment to activate your subscription.',
              tenant: {
                id: result.tenant.id,
                slug: result.tenant.slug,
                plan,
                status: TenantStatus.PENDING,
              },
              requiresPayment: true,
              paymentId,
              checkoutUrl: payment.checkoutUrl,
            };
          }
        } catch (error) {
          console.error('Failed to initiate payment:', error);
          throw new InternalServerErrorException('Failed to initiate payment. Please try again.');
        }
      }
    }

    // For free plan or if payment initiation failed
    return {
      success: true,
      message: plan === TenantPlan.FREE 
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
  async getPaymentStatus(tenantId: string, paymentId: string): Promise<{
    status: PaymentStatus;
    tenantSlug?: string;
  }> {
    const payment = subscriptionPayments.get(paymentId);
    
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
            payment.status = PaymentStatus.COMPLETED;
            payment.updatedAt = new Date();
            subscriptionPayments.set(paymentId, payment);
          }
        } else if (status === PaymentStatus.FAILED) {
          payment.status = PaymentStatus.FAILED;
          payment.updatedAt = new Date();
          subscriptionPayments.set(paymentId, payment);
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
  async handleFlutterwaveWebhook(payload: any, verifHash: string): Promise<{ success: boolean }> {
    // Verify webhook signature
    const flutterwaveAdapter = this.getFlutterwaveAdapter();
    const webhookSecret = this.configService.get<string>('FLUTTERWAVE_WEBHOOK_SECRET');
    
    if (webhookSecret && verifHash !== webhookSecret) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Process webhook based on event type
    const event = payload.event;
    
    if (event === 'charge.completed') {
      const txRef = payload.data.tx_ref;
      const status = payload.data.status;

      // Find payment by transaction reference
      let payment: SubscriptionPayment | undefined;
      for (const [id, p] of subscriptionPayments.entries()) {
        if (p.transactionId === txRef) {
          payment = p;
          break;
        }
      }

      if (!payment) {
        console.warn('Payment not found for webhook:', txRef);
        return { success: false };
      }

      if (status === 'successful' && payment.status !== PaymentStatus.COMPLETED) {
        // Activate subscription
        await this.activateSubscription(payment);
        payment.status = PaymentStatus.COMPLETED;
        payment.updatedAt = new Date();
        subscriptionPayments.set(payment.id, payment);
      }
    }

    return { success: true };
  }

  /**
   * Activate tenant subscription after payment
   */
  private async activateSubscription(payment: SubscriptionPayment): Promise<void> {
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
}

