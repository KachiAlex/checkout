# Tenant Login Migration Guide

This document captures the steps needed to roll out the new dual-authentication experience
(slug + PIN and email + PIN) to existing tenants.

## Summary of changes

- **Backend** now exposes both `/auth/login` (slug + PIN) and `/auth/login/email` (email + PIN).
- **Frontend** login screen allows tenants to pick the method that works best for them.
- Existing super admin login remains unchanged.

## Migration checklist

1. **Verify tenant data**
   - Ensure every active tenant user record has a valid email stored (lowercase, unique per tenant).
   - For any missing emails, coordinate with tenant admins to capture and backfill the data before enabling the new UI for them.

2. **Communicate the update**
   - Notify tenants that they can now log in using their company slug or their email, both with the same secure PIN.
   - Clarify that PIN requirements have not changed, and advise them to keep their PIN confidential.

3. **Rollout sequencing**
   - Enable the updated frontend build (with dual login) once backend changes are deployed.
   - Monitor the `/auth/login/email` endpoint logs to confirm successful adoption and watch for repeated failures that may indicate data issues.

4. **Support & training**
   - Update help-center or onboarding materials to show screenshots of the selector on the login page.
   - Train support reps to help tenants switch between slug and email if they enter the wrong method.

5. **Post-launch validation**
   - Spot check a few tenant accounts (different roles) to confirm both login methods succeed.
   - Capture any tenant feedback and iterate on the UX copy or flow as needed.

## Testing recommendations

- Smoke test both `/auth/login` and `/auth/login/email` via API client (e.g., Thunder Client, Postman) using known-good credentials.
- In the UI, verify that switching tabs preserves the entered PIN and that validation errors surface appropriately.
- Re-run automated lint/tests after deployment to ensure no regressions in shared components.
