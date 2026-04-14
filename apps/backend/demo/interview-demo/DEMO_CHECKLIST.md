<!-- Copied from apps/backend/DEMO_CHECKLIST.md -->
# Demo Checklist (quick)

Before recording
- [ ] Ensure `apps/backend` builds: `npm ci && npx prisma generate`
- [ ] Start API and worker in separate terminals

During recording (ordered)
1. Open GitHub/VSCode and show `apps/backend` tree.
2. Open `prisma/schema.prisma` and highlight `tenantId` on models.
3. Open `src/auth/strategies/jwt.strategy.ts` and `src/auth/guards/roles.guard.ts`.
4. Open `src/tenants/tenants.service.ts` and a repository (show where-clauses).
5. Switch to terminal: run seed + generate tokens + run demo:
```powershell
cd apps/backend
npx prisma generate
cd interview-demo\demo
.\seed-demo-data.ps1
.\generate-demo-tokens.ps1
.\run-demo.ps1 "<TENANT_A_TOKEN>" "<TENANT_B_TOKEN>"
```
6. Show worker logs and API GET results proving tenant isolation.
7. Demonstrate admin role check (403 then 200).
8. Wrap up and point to `apps/backend/interview-demo` and `DEMO.md`.

Recording hints
- Use a local terminal; increase font size.
- Keep the recording tight: if you need longer demos, mark extra clips.
