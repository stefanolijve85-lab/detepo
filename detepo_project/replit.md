# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo + Expo Router

## Artifacts

- **API Server** (`artifacts/api-server`) — shared Express API service at `/api`.
- **Canvas** (`artifacts/mockup-sandbox`) — UI mockup sandbox.
- **Detepo Insights** (`artifacts/mobile`) — Expo mobile app for iOS-style visitor analytics.

## Detepo Insights Mobile App

The mobile app uses a dark Detepo dashboard theme and contains five tabs: Home, Live Flow, Inzichten, Apparaten, and Meldingen. It authenticates against the Detepo dashboard with `POST https://dashboard.detepo.com:443/api/auth/login`, stores the returned dashboard user and JWT locally, and sends `Authorization: Bearer <token>` on dashboard requests whenever a JWT is returned. Token extraction is tolerant of common response shapes (`token`, `jwt`, `accessToken`, nested auth/session objects) so valid dashboard credentials are not rejected due to a naming mismatch. It passes the user's `org_id` into dashboard data requests, fetches live dashboard data from `GET /api/health`, `GET /api/overview`, `GET /api/counters`, and `GET /api/counts/:uuid`, refreshes every 5 seconds for heartbeat-style updates, maps returned teller data into the app screens, and shows a warning notification if the dashboard data cannot be reached. Static teller fallback data is intentionally not used. The Inzichten tab includes AI-style operational insights generated from the current live dashboard values. The login screen uses the Detepo shield logo from `artifacts/mobile/assets/images/detepo-logo.png`.

Key files:

- `artifacts/mobile/hooks/useDashboardData.ts` — live Detepo dashboard fetch/mapping and alert generation.
- `artifacts/mobile/contexts/AuthContext.tsx` — Detepo dashboard credential login and persisted dashboard user.
- `artifacts/mobile/contexts/DashboardContext.tsx` — shared dashboard state provider.
- `artifacts/mobile/app/(tabs)/*.tsx` — app screens.
- `artifacts/mobile/components/*.tsx` — reusable cards, counters, charts, alerts, and badges.
- `artifacts/mobile/constants/colors.ts` — Detepo dark design tokens.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
