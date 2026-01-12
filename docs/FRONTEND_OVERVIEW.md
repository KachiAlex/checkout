# Frontend Overview (React + Vite)

This document describes the frontend architecture: routing, data access, and state management.

## Entry points

- **App component**: `apps/frontend/src/App.tsx`
  - Defines routing (React Router).
  - Lazy-loads pages with `Suspense`.
  - Shows `FixedNavigation` for authenticated users.

- **Config**: `apps/frontend/src/config.ts`
  - Exposes `API_URL` (defaults to Render backend).

## Routing

Routes are defined in `App.tsx` using React Router. Access control is enforced via:

- Checking `useAuthStore()` state
- Redirecting via `<Navigate />`

## State management

- Uses Zustand stores in `apps/frontend/src/stores/*`.
- Key store: `authStore.ts` controls authentication state.

## API access

- Uses Axios for HTTP requests.
- Axios interceptors in `authStore.ts` attach the `Authorization: Bearer <token>` header.

## Key UX subsystems

- **Navigation**: `FixedNavigation` (bottom nav)
- **Toasts**: `react-hot-toast`
- **Capacitor integrations** (scanner/camera) for mobile/Android build.

## Where to look next

- Pages overview: `FRONTEND_PAGES.md`
- Stores + services: `FRONTEND_STATE_AND_SERVICES.md`
