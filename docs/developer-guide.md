# Developer Guide

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker** & Docker Compose (Desktop w/ WSL2 integration on Windows)
- **PostgreSQL** 15+ (auto-provisioned via Docker Compose)
- **Redis** 7+ (auto-provisioned via Docker Compose)

> **Windows setup tip:**
> ```powershell
> wsl --update
> wsl --set-default-version 2
> ```
> Reboot, then install/launch Docker Desktop and ensure **Settings → Resources → WSL integration** is enabled.

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd pos-checkout-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your configuration

# Frontend
cp apps/frontend/.env.example apps/frontend/.env
# Edit apps/frontend/.env with your configuration
```

4. Start infrastructure (PostgreSQL + Redis + API + Frontend):
```bash
npm run docker:up
```

The command provisions containers with health checks and will rebuild the backend/frontend as needed. Stop the stack with:

```bash
npm run docker:down
```

5. Run database migrations:
```bash
npm run migration:run
npm run seed
```

6. Start development servers:
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs

## Architecture

### Monorepo Structure

```
pos-checkout-mvp/
├── apps/
│   ├── frontend/          # React PWA with IndexedDB
│   └── backend/           # NestJS API
├── packages/
│   ├── shared/            # Shared TypeScript types
│   └── payment-adapters/  # Payment gateway adapters
├── infra/
│   ├── docker/            # Dockerfiles
│   └── k8s/               # Kubernetes manifests
└── docs/                  # Documentation
```

### Technology Stack

- **Frontend**: React + TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: NestJS + TypeScript, TypeORM, PostgreSQL, Redis
- **Infrastructure**: Docker, Kubernetes, GitHub Actions

## Development Workflow

### Running Tests

```bash
# Run all tests
npm run test

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test -- --watch
```

### Building

```bash
# Build all packages
npm run build

# Build specific workspace
npm run build --workspace=apps/backend
```

### Database Migrations

```bash
# Generate migration
npm run migration:generate --workspace=apps/backend -- --name=MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert --workspace=apps/backend
```

## API Development

### Adding a New Endpoint

1. Create DTOs in `apps/backend/src/<module>/dto/`
2. Add service method in `apps/backend/src/<module>/<module>.service.ts`
3. Add controller route in `apps/backend/src/<module>/<module>.controller.ts`
4. Add Swagger decorators for API documentation
5. Write tests

### Authentication

All endpoints (except auth endpoints) require JWT authentication:

```typescript
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
```

## Frontend Development

### Adding a New Page

1. Create component in `apps/frontend/src/pages/`
2. Add route in `apps/frontend/src/App.tsx`
3. Add navigation if needed

### State Management

We use Zustand for state management:
- `authStore`: Authentication state
- `cartStore`: Shopping cart state

### Offline Support

The frontend uses IndexedDB for offline storage via Dexie. All orders are stored locally before syncing to the server.

## Payment Integration

### Adding a New Payment Adapter

1. Create adapter class implementing `PaymentAdapter` interface
2. Add to `packages/payment-adapters/src/`
3. Export in `packages/payment-adapters/src/index.ts`
4. Use in `PaymentsService`

See [Payment Integration Guide](./payment-integration.md) for details.

## Deployment

### Docker Compose

```bash
docker-compose up -d
```

### Firebase Hosting (Web App)

```bash
# Install CLI (first time only)
npx firebase login

# Set your Firebase project (replace with actual ID)
firebase use --add

# Build and deploy the React PWA
npm run deploy:web
```

`deploy:web` runs the frontend production build and publishes the contents of `apps/frontend/dist` to Firebase Hosting using the configuration in `firebase.json`. Update `.firebaserc` with your Firebase project ID before the first deployment.

### Firebase Functions (Backend API)

The NestJS backend is packaged as a single HTTPS Firebase Function (`api`). To deploy it:

1. **Configure secrets and environment variables** (run once per project):
   ```bash
   firebase functions:secrets:set DATABASE_URL
   firebase functions:secrets:set JWT_SECRET
   firebase functions:secrets:set JWT_REFRESH_SECRET
   # Optional: only if you have a managed Redis instance
   firebase functions:secrets:set REDIS_URL
   ```
   > Tip: leave `ENABLE_BULL` unset (or set it to `false`) unless you really need Redis-powered queues—this keeps the function lightweight and avoids unexpected billing.

2. **Optional runtime tuning**  
   Set these (if needed) to control cost/behaviour:
   - `FUNCTION_REGION` (defaults to `us-central1`)
   - `FUNCTION_MAX_INSTANCES` (defaults to `2`)
   - `TYPEORM_RUN_MIGRATIONS` (`true/false`, defaults to `false` in production)

3. **Build and deploy the function**:
   ```bash
   npm run deploy:functions
   ```
   This script builds the NestJS backend, copies the compiled artifacts into `functions/backend-dist`, and compiles the TypeScript entrypoint before running `firebase deploy --only functions`.

4. **API URL**  
   Once deployed, the HTTPS endpoint is:
   ```
   https://<region>-<project-id>.cloudfunctions.net/api
   ```
   Update `VITE_API_URL` (or let the frontend fallback) to point at the function URL so the web client calls the hosted backend.

### Kubernetes

```bash
# Apply namespace
kubectl apply -f infra/k8s/namespace.yaml

# Apply resources
kubectl apply -f infra/k8s/

# Check status
kubectl get pods -n pos-checkout
```

### Firebase Hosting (Web)

1. Create a Firebase project (or reuse an existing one) in the [Firebase console](https://console.firebase.google.com/).
2. Update `.firebaserc` with your project ID:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```
3. Authenticate once on the workstation:
   ```bash
   npx firebase login
   ```
4. Deploy the PWA build to Firebase Hosting:
   ```bash
   npm run deploy:web
   ```

This script compiles the React app (`apps/frontend/dist`) and uploads it to Hosting. The configuration lives in `firebase.json`, which also handles SPA rewrites so client-side routing resolves via `index.html`.

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `docker-compose ps`
- Check connection string in `.env`
- Verify database exists: `psql -U pos_user -d pos_db`

### Redis Connection Issues

- Ensure Redis is running: `docker-compose ps redis`
- Check Redis URL in `.env`

### Port Conflicts

- Backend default: 3000 (change `PORT` in `.env`)
- Frontend default: 5173 (change in `vite.config.ts`)

## Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write tests for all new features
- Document public APIs

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Update documentation
5. Submit pull request
