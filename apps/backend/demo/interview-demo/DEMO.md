<!-- Copied from apps/backend/DEMO.md -->
# Backend Walkthrough Demo

This file contains a short, reproducible demo plan and helper scripts to record a 5–8 minute walkthrough showing tenant isolation, auth/roles, and an async event flow.

Prerequisites
- Clone this repo and `cd apps/backend`
- Ensure environment variables are set (see `.env.example`). For demo JWT generation you may set `JWT_SECRET` (defaults to `demo-secret` in scripts if not set).
- Start the backend server and worker in separate shells (see commands below).

What to show in the recording
1. Project tree: show `apps/backend/src`, `src/auth`, `src/tenants`, `src/orders`, `src/sync`, and `prisma/schema.prisma`.
2. Tenant isolation: open `src/tenants/*` and `src/*/*.repository.ts` to show `tenantId` scoping and DB schema.
3. Auth & roles: open `src/auth/strategies/jwt.strategy.ts`, `src/auth/guards/roles.guard.ts`, and `src/auth/auth.controller.ts`.
4. Async flow: open `src/orders/*` (API), `src/sync/sync.service.ts` (ingest/processor), and demonstrate an order `created` event processed by the sync flow.

Quick commands (developer machine)
```powershell
# Start API
cd apps/backend
npm ci
npm run start:dev

# (optional) In another shell: start worker or process that handles sync events
npm run worker:dev
```

Generate demo JWTs (local, no external calls)
```bash
cd apps/backend/interview-demo/demo
./generate-demo-tokens.sh
# this prints two tokens: TENANT_A_TOKEN and TENANT_B_TOKEN
```

Run the tenant isolation demo (with tokens printed above)
```bash
./run-demo.sh TENANT_A_TOKEN TENANT_B_TOKEN
```

Expected demo interactions
- POST an order as Tenant A → GET orders as Tenant A (visible)
- GET same order with Tenant B token → 404/empty (isolation)
- Call admin-only endpoint with non-admin token → 403; with admin token → 200
- Show `sync` worker logs processing the `order.created` event and DB update

Notes
- These helper scripts are intentionally non-destructive and only demonstrate requests; adapt them to your local environment before recording.
