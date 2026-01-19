// Shared types and interfaces for POS Checkout MVP

export enum UserRole {
  CASHIER = "cashier",
  MANAGER = "manager",
  ADMIN = "admin",
}

export enum PaymentMethod {
  CARD = "card",
  QR = "qr",
  CASH = "cash",
  TRANSFER = "transfer",
  CREDIT = "credit",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum OrderStatus {
  DRAFT = "draft",
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum InventoryTransactionType {
  SALE = "sale",
  CREDIT_SALE = "credit_sale",
  RETURN = "return",
  ADJUST = "adjust",
  RECEIVED = "received",
}

export enum DeviceType {
  USB = "usb",
  BLUETOOTH = "bluetooth",
  CAMERA = "camera",
}

export enum TenantPlan {
  FREE = "free", // 14-day free trial
  STARTER = "starter",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
  MONTHLY = "monthly", // Legacy
  ANNUAL = "annual", // Legacy
  LIFETIME = "lifetime", // Legacy
  TRIAL = "trial", // Legacy
}

export enum TenantStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CANCELLED = "cancelled",
  PENDING = "pending",
}

export enum Industry {
  GENERAL = "general",
  PHARMACEUTICAL = "pharmaceutical",
  RESTAURANT = "restaurant",
  RETAIL = "retail",
  GROCERY = "grocery",
  ELECTRONICS = "electronics",
  FASHION = "fashion",
  HARDWARE = "hardware",
}

export interface IndustryFeatureFlags {
  // Pharmaceutical features
  expiryTracking?: boolean;
  batchTracking?: boolean;
  prescriptionManagement?: boolean;
  drugInteractionWarnings?: boolean;
  prescriptionRefills?: boolean;

  // Restaurant features
  tableManagement?: boolean;
  kitchenOrders?: boolean;
  menuModifiers?: boolean;
  splitBills?: boolean;
  reservations?: boolean;

  // Retail features
  variantManagement?: boolean;
  layaway?: boolean;
  giftCards?: boolean;
  loyaltyPrograms?: boolean;

  // General features
  multiLocation?: boolean;
  advancedReports?: boolean;
  apiAccess?: boolean;
}

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface User extends BaseEntity {
  name: string;
  role: UserRole;
  pin_hash: string;
  device_id?: string;
  location_id?: string;
  tenant_id?: string;
  is_platform_admin?: boolean;
}

export interface InviteUserPayload {
  email: string;
  name: string;
  role: UserRole;
  location_id?: string;
}

export interface Location extends BaseEntity {
  name: string;
  address?: string;
  timezone: string;
  default_printer?: string;
  tenant_id?: string;
}

export interface Product extends BaseEntity {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  price_cents: number;
  cost_cents?: number;
  tax_rate: number;
  variants?: Record<string, unknown>;
  images?: string[];
  tenant_id?: string;
}

export interface Inventory extends BaseEntity {
  product_id: string;
  location_id: string;
  quantity: number;
  cost_cents?: number;
  sales_price_cents?: number;
}

export interface InventoryTransaction extends BaseEntity {
  product_id: string;
  location_id: string;
  delta: number;
  type: InventoryTransactionType;
  reference_id?: string;
  user_id?: string;
  ts: Date;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  price_cents: number;
  tax_cents: number;
  discount_cents?: number;
}

export interface Order extends BaseEntity {
  uuid: string;
  order_number: string;
  location_id: string;
  items: OrderItem[];
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  status: OrderStatus;
  created_by: string;
}

export interface Payment extends BaseEntity {
  order_id: string;
  amount_cents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  processor_data?: Record<string, unknown>;
}

export interface AuditLog extends BaseEntity {
  entity: string;
  entity_id: string;
  action: string;
  actor_id?: string;
  before_json?: Record<string, unknown>;
  after_json?: Record<string, unknown>;
  ts: Date;
}

export interface RegisteredDevice extends BaseEntity {
  identifier: string;
  name: string;
  type: DeviceType;
  hardware_id?: string;
  vendor_id?: string;
  product_id?: string;
  location_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  last_seen_at?: Date;
  last_used_at?: Date;
}

export interface SyncEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  client_ts: number;
}

export interface DeviceRegistration {
  device_id: string;
  public_key: string;
  location_id?: string;
  user_id?: string;
}

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  industry?: Industry;
  feature_flags?: IndustryFeatureFlags;
  seat_limit?: number;
  contact_email?: string;
  billing_cycle_start?: Date;
  billing_cycle_end?: Date;
  metadata?: Record<string, unknown>;
}
