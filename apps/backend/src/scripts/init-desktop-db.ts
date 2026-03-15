import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import type { PrismaClient as PrismaClientType } from "@prisma/client";

const DEFAULT_SQLITE_URL = "file:../data/checkout-desktop.db";
const DESKTOP_SLUG = "demo-retail";
const DESKTOP_TENANT_NAME = "Demo Retail Co.";
const ADMIN_EMAIL = "admin@demo-retail.local";
const ADMIN_PIN = "1234";

type LoadedEnv = Record<string, string>;

function loadEnvFiles(): void {
  const projectRoot = findProjectRoot();
  const candidates = [
    path.join(projectRoot, ".env.desktop"),
    path.join(projectRoot, ".env"),
  ];

  candidates.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      applyEnvFile(filePath);
    }
  });
}

function applyEnvFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf8");
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
}

function findProjectRoot(): string {
  let currentDir = process.cwd();
  const markers = [".git", "pnpm-workspace.yaml", "package-lock.json"];

  while (true) {
    if (markers.some((file) => fs.existsSync(path.join(currentDir, file)))) {
      return currentDir;
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      return currentDir;
    }
    currentDir = parent;
  }
}

function resolveDatabaseUrl(): string {
  const isDesktop = process.env.DESKTOP_MODE === "true";
  if (isDesktop) {
    return process.env.DESKTOP_SQLITE_PATH || DEFAULT_SQLITE_URL;
  }

  return process.env.DATABASE_URL || "";
}

function ensureSqliteDirectory(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return;
  }

  const rawPath = databaseUrl.replace(/^file:/, "");
  if (!rawPath || rawPath === ":memory:") {
    return;
  }

  const absolutePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function prepareDesktopSchema(projectRoot: string) {
  const baseSchemaPath = path.join(projectRoot, "apps", "backend", "prisma", "schema.prisma");
  const tempDir = path.join(projectRoot, ".prisma");
  const clientOutputDir = path.join(tempDir, "desktop-client");
  const tempSchemaPath = path.join(tempDir, "schema.desktop.prisma");

  fs.mkdirSync(tempDir, { recursive: true });

  const baseSchema = fs.readFileSync(baseSchemaPath, "utf8");

  const desktopDatasource = [
    "datasource db {",
    '  provider = "sqlite"',
    '  url      = env("DATABASE_URL")',
    "}",
  ].join("\n");

  const desktopGenerator = [
    "generator client {",
    '  provider = "prisma-client-js"',
    `  output   = "${clientOutputDir.replace(/\\/g, "/")}"`,
    "}",
  ].join("\n");

  const datasourceRegex = /datasource\s+db\s+\{[\s\S]*?\}/m;
  const generatorRegex = /generator\s+client\s+\{[\s\S]*?\}/m;

  let withSqlite = baseSchema
    .replace(datasourceRegex, desktopDatasource)
    .replace(generatorRegex, desktopGenerator);

  // SQLite connector does not support enums; strip enum blocks and coerce usages to String
  const enumRegex = /enum\s+(\w+)\s+\{[\s\S]*?\}/g;
  const enumNames: string[] = [];
  withSqlite = withSqlite.replace(enumRegex, (_match, name: string) => {
    enumNames.push(name);
    return "";
  });

  enumNames.forEach((name) => {
    const typeUsage = new RegExp(`\\b${name}\\b`, "g");
    withSqlite = withSqlite.replace(typeUsage, "String");
  });

  // Quote any remaining unquoted enum-like defaults (e.g., @default(OPEN))
  const unquotedDefaultRegex = /@default\(\s*([A-Z0-9_]+)\s*\)/g;
  withSqlite = withSqlite.replace(unquotedDefaultRegex, (_m, val: string) => `@default("${val}")`);

  fs.writeFileSync(tempSchemaPath, withSqlite, "utf8");

  return { tempSchemaPath, clientOutputDir };
}

async function runDbPush(projectRoot: string, databaseUrl: string, schemaPath: string) {
  console.log("📦 Running Prisma db push for desktop (sqlite)...");
  execSync(`npx prisma db push --schema "${schemaPath}"`, {
    stdio: "inherit",
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

async function generateDesktopClient(projectRoot: string, databaseUrl: string, schemaPath: string) {
  console.log("🛠️ Generating Prisma client for desktop (sqlite)...");
  execSync(`npx prisma generate --schema "${schemaPath}"`, {
    stdio: "inherit",
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

async function seedDefaults(prisma: PrismaClientType) {
  let tenant = await prisma.tenant.findFirst({ where: { slug: DESKTOP_SLUG } });
  if (!tenant) {
    console.log("🏢 Creating demo tenant...");
    tenant = await prisma.tenant.create({
      data: {
        id: randomUUID(),
        name: DESKTOP_TENANT_NAME,
        slug: DESKTOP_SLUG,
        plan: "STARTER",
        status: "ACTIVE",
        industry: "retail",
        featureFlags: {},
      },
    });
  }

  let location = await prisma.location.findFirst({ where: { tenantId: tenant.id } });
  if (!location) {
    console.log("📍 Creating default location...");
    location = await prisma.location.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: "Main Store",
        address: "123 Demo Street",
        timezone: "Africa/Lagos",
      },
    });
  }

  const adminPinHash = await bcrypt.hash(ADMIN_PIN, 10);
  let admin = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    console.log("👤 Creating default admin user...");
    admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: "Demo Admin",
        email: ADMIN_EMAIL,
        role: "ADMIN",
        pinHash: adminPinHash,
        locationId: location?.id,
        isPlatformAdmin: false,
      },
    });
  }

  return { tenant, location, admin };
}

async function main() {
  loadEnvFiles();
  process.env.DESKTOP_MODE = process.env.DESKTOP_MODE ?? "true";

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DESKTOP_SQLITE_PATH must be set for initialization.");
  }

  ensureSqliteDirectory(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;

  const projectRoot = findProjectRoot();
  const { tempSchemaPath, clientOutputDir } = prepareDesktopSchema(projectRoot);
  await runDbPush(projectRoot, databaseUrl, tempSchemaPath);
  await generateDesktopClient(projectRoot, databaseUrl, tempSchemaPath);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require(path.join(clientOutputDir, "index.js")) as {
    PrismaClient: typeof PrismaClientType;
  };
  const prisma: PrismaClientType = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const { tenant, admin } = await seedDefaults(prisma);
    console.log("✅ Desktop database ready.");
    console.log("Tenant:", `${tenant.slug} (${tenant.name})`);
    console.log("Admin Email:", admin.email);
    console.log("Admin PIN:", ADMIN_PIN);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Failed to initialize desktop database:", error);
  process.exit(1);
});
