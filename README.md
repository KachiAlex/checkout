# POS Checkout MVP

Production-ready Point-of-Sale system for superstores and supermarkets with offline-first support, integrated payment terminals, and real-time inventory management.

## 🎯 Features

- **Fast Checkout**: Barcode/QR scanning + manual entry
- **Multi-Payment**: Card/contactless + QR/mobile wallet via integrated terminals
- **Offline-First**: Local DB with robust sync and conflict resolution
- **Multi-Store**: Centralized reporting with store-level autonomy
- **PCI-Aware**: Tokenization, no PAN/CVV storage, TLS everywhere

## 🏗️ Architecture

```
pos-checkout-mvp/
├── apps/
│   ├── frontend/          # React + TypeScript PWA
│   └── backend/           # NestJS API
├── packages/
│   ├── shared/            # Shared types and utilities
│   └── payment-adapters/  # Payment gateway adapters
├── infra/
│   ├── docker/            # Dockerfiles
│   ├── k8s/               # Kubernetes manifests
│   └── docker-compose.yml # Local development
└── docs/                  # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Local Development

1. **Clone and install dependencies:**

```bash
git clone <repo-url>
cd pos-checkout-mvp
npm install
```

2. **Start infrastructure:**

```bash
docker-compose up -d postgres redis
```

3. **Setup environment variables:**

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edit .env files with your configuration
```

4. **Run database migrations:**

```bash
npm run migration:run
npm run seed
```

5. **Start development servers:**

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs

### Docker Compose (All Services)

```bash
npm run docker:up
```

## 📦 Monorepo Structure

- **apps/frontend**: React + TypeScript PWA with IndexedDB for offline storage
- **apps/backend**: NestJS REST API with PostgreSQL and Redis
- **packages/shared**: Shared TypeScript types and utilities
- **packages/payment-adapters**: Payment gateway adapter interfaces and implementations

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test -- --watch
```

## 🏭 Production Deployment

See [docs/deployment.md](./docs/deployment.md) for Kubernetes deployment instructions.

## 📚 Documentation

- [Developer Guide](./docs/developer-guide.md)
- [API Documentation](http://localhost:3000/api/docs) - Swagger UI when backend is running
- [Payment Terminal Integration](./docs/payment-integration.md)
- [PCI Compliance Checklist](./docs/pci-checklist.md)
- [Project Summary](./docs/project-summary.md)

## 🔒 Security

- JWT authentication with refresh tokens
- Device registration with public-key binding
- PCI-DSS compliant payment handling
- TLS/HTTPS mandatory
- Tokenization for card data

## 📄 License

Proprietary - All Rights Reserved

## 🤝 Contributing

See [docs/developer-guide.md](./docs/developer-guide.md) for development guidelines.

## ✅ Implementation Status

**MVP Status: COMPLETE ✅**

All MVP features have been implemented:

- ✅ Authentication & Authorization
- ✅ Products & Inventory Management
- ✅ Checkout & Payment Processing
- ✅ Offline Sync with Idempotency
- ✅ Reports & Analytics
- ✅ Receipt Generation
- ✅ Complete Test Suite
- ✅ Full Documentation

See [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) for details.
