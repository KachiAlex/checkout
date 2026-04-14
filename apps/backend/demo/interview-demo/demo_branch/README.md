<!-- Copied from apps/backend/demo_branch/README.md -->
# Demo Branch (sanitized content)

This folder contains the files that you can include in a demo branch or bundle to share with recruiters without any secrets.

Included items (already present in the repo):
- `DEMO.md` — high-level walkthrough and commands.
- `DEMO_RECORDING.md` — timed recording guide for a 6-minute walkthrough.
- `demo/seed-demo-data.js` & `demo/seed-demo-data.ps1` — seed two demo tenants and create deterministic admin users (no real credentials).
- `demo/generate-demo-tokens.sh` / `demo/generate-demo-tokens.ps1` — local token generators using `JWT_SECRET` or a safe fallback.
- `demo/run-demo.sh` / `demo/run-demo.ps1` — runs example API calls to demonstrate tenant isolation and async processing.

How to prepare a demo branch
1. Create a new branch locally: `git checkout -b demo/walkthrough`
2. Remove any development `.env` that contains secrets (do not commit `.env`).
3. Add a `.env.example` with placeholder values.
4. Commit only the demo files and the `DEMO_*.md` files — no secrets.

Notes
- These scripts are intentionally non-destructive and are safe for a local demo environment. They seed demo tenants and use placeholder pin hashes.
- When sharing, include a short `DEMO_RECORDING.md` (this file) and the `DEMO.md` for reproducible steps.
