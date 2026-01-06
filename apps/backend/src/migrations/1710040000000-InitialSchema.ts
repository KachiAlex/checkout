import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710040000000 implements MigrationInterface {
  name = 'InitialSchema1710040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "locations" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "name" character varying(255) NOT NULL,
      "address" text,
      "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
      "default_printer" character varying(255),
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_locations_id" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(
      `CREATE TYPE IF NOT EXISTS "public"."users_role_enum" AS ENUM('cashier','manager','admin')`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "name" character varying(255) NOT NULL,
      "role" "public"."users_role_enum" NOT NULL DEFAULT 'cashier',
      "pin_hash" character varying(255) NOT NULL,
      "device_id" character varying(255),
      "location_id" uuid,
      "public_key" text,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_users_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_users_location" ON "users" ("location_id")',
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "products" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "sku" character varying(100) NOT NULL,
      "barcode" character varying(100),
      "name" character varying(255) NOT NULL,
      "description" text,
      "price_cents" bigint NOT NULL,
      "cost_cents" bigint,
      "tax_rate" numeric(5,4) NOT NULL DEFAULT 0,
      "variants" jsonb,
      "images" text[],
      "active" boolean NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_products_sku" UNIQUE ("sku"),
      CONSTRAINT "UQ_products_barcode" UNIQUE ("barcode")
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_products_sku" ON "products" USING btree ("sku")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_products_barcode" ON "products" USING btree ("barcode")',
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "inventory" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "product_id" uuid NOT NULL,
      "location_id" uuid NOT NULL,
      "quantity" integer NOT NULL DEFAULT 0,
      "reorder_point" integer,
      "max_stock" integer,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_inventory_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_inventory_product_location" UNIQUE ("product_id", "location_id"),
      CONSTRAINT "FK_inventory_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_inventory_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_inventory_product" ON "inventory" ("product_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_inventory_location" ON "inventory" ("location_id")',
    );

    await queryRunner.query(
      `CREATE TYPE IF NOT EXISTS "public"."inventory_transactions_type_enum" AS ENUM('sale','return','adjust','received')`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "inventory_transactions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "product_id" uuid NOT NULL,
      "location_id" uuid NOT NULL,
      "delta" integer NOT NULL,
      "type" "public"."inventory_transactions_type_enum" NOT NULL,
      "reference_id" uuid,
      "user_id" uuid,
      "ts" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes" text,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_inventory_transactions_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_inventory_tx_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_inventory_tx_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_inventory_tx_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_inventory_tx_product_location" ON "inventory_transactions" ("product_id", "location_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_inventory_tx_ts" ON "inventory_transactions" ("ts")',
    );

    await queryRunner.query(
      `CREATE TYPE IF NOT EXISTS "public"."orders_status_enum" AS ENUM('draft','pending','completed','cancelled')`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "orders" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "uuid" uuid NOT NULL,
      "order_number" character varying(50) NOT NULL,
      "location_id" uuid NOT NULL,
      "items" jsonb NOT NULL,
      "subtotal_cents" bigint NOT NULL,
      "tax_cents" bigint NOT NULL,
      "discount_cents" bigint NOT NULL DEFAULT 0,
      "total_cents" bigint NOT NULL,
      "status" "public"."orders_status_enum" NOT NULL DEFAULT 'draft',
      "created_by" uuid NOT NULL,
      "device_id" uuid,
      "completed_at" TIMESTAMP,
      "notes" text,
      "synced" boolean NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_orders_uuid" UNIQUE ("uuid"),
      CONSTRAINT "FK_orders_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_orders_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_orders_location_created" ON "orders" ("location_id", "created_at")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_orders_order_number" ON "orders" ("order_number")',
    );

    await queryRunner.query(
      `CREATE TYPE IF NOT EXISTS "public"."payments_method_enum" AS ENUM('card','qr','cash')`,
    );
    await queryRunner.query(
      `CREATE TYPE IF NOT EXISTS "public"."payments_status_enum" AS ENUM('pending','processing','completed','failed','refunded')`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "payments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "order_id" uuid NOT NULL,
      "amount_cents" bigint NOT NULL,
      "currency" character varying(3) NOT NULL DEFAULT 'NGN',
      "method" "public"."payments_method_enum" NOT NULL,
      "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
      "processor_data" jsonb,
      "transaction_id" character varying(255),
      "error" text,
      "processed_at" TIMESTAMP,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_payments_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_payments_order" ON "payments" ("order_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status")',
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "entity" character varying(50) NOT NULL,
      "entity_id" uuid NOT NULL,
      "action" character varying(50) NOT NULL,
      "actor_id" uuid,
      "before_json" jsonb,
      "after_json" jsonb,
      "ts" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes" text,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entity_entityId" ON "audit_logs" ("entity", "entity_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_audit_logs_ts" ON "audit_logs" ("ts")',
    );

    await queryRunner.query(
      `CREATE TYPE IF NOT EXISTS "public"."devices_type_enum" AS ENUM('usb','bluetooth','camera')`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "devices" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "identifier" character varying(255) NOT NULL,
      "name" character varying(255) NOT NULL,
      "type" "public"."devices_type_enum" NOT NULL,
      "hardware_id" character varying(255),
      "vendor_id" character varying(50),
      "product_id" character varying(50),
      "location_id" uuid,
      "registered_by" uuid,
      "last_used_by" uuid,
      "is_active" boolean NOT NULL DEFAULT true,
      "metadata" jsonb,
      "last_seen_at" TIMESTAMP,
      "last_used_at" TIMESTAMP,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_devices_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_devices_identifier" UNIQUE ("identifier"),
      CONSTRAINT "FK_devices_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_devices_registered_by" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_devices_last_used_by" FOREIGN KEY ("last_used_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_devices_location" ON "devices" ("location_id")',
    );
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_devices_type" ON "devices" ("type")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_devices_type"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_devices_location"');
    await queryRunner.query('DROP TABLE IF EXISTS "devices"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."devices_type_enum"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_audit_logs_ts"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_audit_logs_entity_entityId"');
    await queryRunner.query('DROP TABLE IF EXISTS "audit_logs"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payments_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payments_order"');
    await queryRunner.query('DROP TABLE IF EXISTS "payments"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."payments_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."payments_method_enum"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_orders_order_number"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_orders_location_created"');
    await queryRunner.query('DROP TABLE IF EXISTS "orders"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."orders_status_enum"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_inventory_tx_ts"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_inventory_tx_product_location"');
    await queryRunner.query('DROP TABLE IF EXISTS "inventory_transactions"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."inventory_transactions_type_enum"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_inventory_location"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_inventory_product"');
    await queryRunner.query('DROP TABLE IF EXISTS "inventory"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_products_barcode"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_products_sku"');
    await queryRunner.query('DROP TABLE IF EXISTS "products"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_location"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."users_role_enum"');

    await queryRunner.query('DROP TABLE IF EXISTS "locations"');
  }
}
