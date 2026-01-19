export declare enum UserRole {
  CASHIER = "cashier",
  MANAGER = "manager",
  ADMIN = "admin",
}
export declare enum PaymentMethod {
  CARD = "card",
  QR = "qr",
  CASH = "cash",
}
export declare enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}
export declare enum OrderStatus {
  DRAFT = "draft",
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}
export declare enum InventoryTransactionType {
  SALE = "sale",
  RETURN = "return",
  ADJUST = "adjust",
  RECEIVED = "received",
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
}
export interface Location extends BaseEntity {
  name: string;
  address?: string;
  timezone: string;
  default_printer?: string;
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
