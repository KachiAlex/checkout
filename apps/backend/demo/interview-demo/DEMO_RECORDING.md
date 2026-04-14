<!-- Copied from apps/backend/DEMO_RECORDING.md -->
# Demo Recording Guide — Backend Walkthrough

Purpose: a short script and timings to record a 5–8 minute walkthrough demonstrating code structure, tenant isolation, auth/roles, and one async flow.

Target recording length: 6 minutes (approx.)

0:00–0:30 — Intro
- Show repo root in GitHub or VS Code explorer. Say: "This is the Checkout backend. I'll show tenant isolation, auth/roles, and an async event flow."

0:30–1:30 — Code structure
- Open `apps/backend` tree. Show `src/auth`, `src/tenants`, `src/orders`, `src/sync`, and `prisma/schema.prisma`.
- Highlight `prisma/schema.prisma` tenantId fields.

1:30–2:30 — Tenant isolation
- Open `src/tenants/tenants.service.ts` and `src/tenants/tenants.repository.ts`.
- Explain where tenantId is created and how queries are scoped (repository where-clauses / Prisma `where: { tenantId }`).

2:30–3:30 — Auth & roles
- Open `src/auth/strategies/jwt.strategy.ts` to show `tenantId` and `role` in JWT payload.
- Open `src/auth/guards/roles.guard.ts` and point out `@Roles(...)` usage on controllers.

3:30–5:00 — Live demo: run scripts (PowerShell)
- Show `apps/backend/interview-demo/demo` folder (scripts: seed-demo-data, generate-demo-tokens, run-demo).
- Terminal commands (copy in your recording):
```powershell
cd apps/backend
npm ci
npx prisma generate
cd interview-demo\demo
.\seed-demo-data.ps1
.\generate-demo-tokens.ps1
.\run-demo.ps1 "<TENANT_A_TOKEN>" "<TENANT_B_TOKEN>"
```
- While `run-demo` runs, switch to worker logs or API responses showing the created order and the sync processing result. Show that Tenant B does not see Tenant A's order.

5:00–5:45 — Role enforcement demo
- Use tokens printed earlier: call an admin-only endpoint with a non-admin token (show 403), then with admin token (show 200).

5:45–6:00 — Wrap-up
- Point to `apps/backend/interview-demo` and `DEMO.md` for reproducible steps; mention no secrets are included.

Recording tips
- Increase terminal font size and IDE font zoom for readability.
- Use copy/paste of commands (avoid typing long secrets on-camera).
- Keep a short script in front of you and follow timestamps.
