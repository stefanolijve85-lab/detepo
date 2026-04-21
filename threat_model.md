# Threat Model

## Project Overview

Detepo is a pnpm TypeScript monorepo with three main artifacts: a production Express API server (`artifacts/api-server`), a production Expo mobile application (`artifacts/mobile`), and a dev-only mockup sandbox (`artifacts/mockup-sandbox`). The mobile app authenticates against the external Detepo dashboard at `https://dashboard.detepo.com/api`, stores dashboard session state locally on the device, fetches organization analytics, and includes a BLE-based device onboarding flow for FP111 counters.

For production scanning, the primary in-repo attack surface is the mobile application and its companion static serving code. The mockup sandbox is development-only and should be ignored unless separate evidence shows it is deployed in production. Platform-managed TLS protects deployed client-to-server traffic on Replit, but that assumption does not cover third-party endpoints or device-to-service communication hard-coded by the app.

## Assets

- **Dashboard user sessions** — Detepo dashboard bearer tokens and associated user profile data stored by the mobile app. Compromise allows unauthorized access to customer analytics and device information.
- **Operational analytics data** — occupancy, visitor counts, counter health, and organization-scoped telemetry retrieved from the external dashboard. Tampering or disclosure affects customer privacy and business reporting integrity.
- **Counter onboarding secrets** — Wi-Fi SSIDs/passwords entered during BLE provisioning and the server endpoint configuration pushed to counters. Exposure can grant network access or redirect devices to attacker-controlled services.
- **Device telemetry path** — the address, protocol, and integrity of uploads from counters to the Detepo backend. Weak transport here can let attackers spoof or alter reported counts.
- **Application secrets and infrastructure config** — environment variables such as `DATABASE_URL`, API origins, and deployment headers used by runtime services.

## Trust Boundaries

- **Mobile client to external Detepo dashboard** — all login and analytics requests cross from an untrusted mobile client to `dashboard.detepo.com`. The app must treat the device as hostile and protect tokens at rest.
- **User to authenticated app boundary** — login is required for dashboard views; route guards must also protect privileged utility screens such as counter provisioning.
- **Mobile app to nearby BLE devices** — the provisioning flow crosses from a user-controlled phone into nearby counters over BLE. The app must authenticate target devices before sending Wi-Fi credentials or server configuration.
- **Counter to Detepo backend** — provisioned devices later POST telemetry to the configured server address. Integrity and confidentiality depend on the configured transport, not on the mobile app’s own HTTPS usage.
- **Static server to internet** — `artifacts/mobile/server/serve.js` and `artifacts/api-server` accept HTTP requests and must not trust request metadata or origins without validation.
- **Server to database** — shared DB code uses `DATABASE_URL`; any future API expansion must preserve parameterized DB access and secret handling.

## Scan Anchors

- **Production entry points:** `artifacts/mobile/app/_layout.tsx`, `artifacts/mobile/contexts/AuthContext.tsx`, `artifacts/mobile/hooks/useDashboardData.ts`, `artifacts/mobile/hooks/useBLE.ts`, `artifacts/mobile/server/serve.js`, `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`
- **Highest-risk code areas:** mobile auth/token persistence, BLE provisioning (`bluetooth-scan.tsx`, `useBLE.ts`), any route guards around authenticated vs unauthenticated screens, and static serving code that reflects request headers into responses
- **Public vs authenticated surfaces:** `/login` is public; `(tabs)` is authenticated; `bluetooth-scan` must be treated as privileged because it can configure physical counters and collects Wi-Fi credentials
- **Dev-only areas:** `artifacts/mockup-sandbox/**`, most of `artifacts/mobile/scripts/**`, `lib/api-spec/**`, and workspace utility scripts unless production reachability is demonstrated

## Threat Categories

### Spoofing

The project trusts external dashboard credentials for user access and trusts nearby BLE peripherals during device onboarding. The mobile app must validate and consistently enforce authentication before exposing privileged routes, and the provisioning flow must ensure the target counter is genuine before sending Wi-Fi credentials or backend configuration.

### Tampering

Operational dashboards and counter telemetry are only valuable if the underlying counts are authentic. Device configuration and upload paths must resist local-network or nearby-device tampering; otherwise attackers can redirect counters, alter telemetry, or poison analytics.

### Information Disclosure

The most sensitive local data is the persisted dashboard token and the Wi-Fi password entered during counter onboarding. These values must not be stored in plaintext mobile storage, exposed through logs, or sent to unauthenticated or unverified devices.

### Denial of Service

The API server is currently minimal, but both the static server and mobile app depend on external services and nearby BLE interactions. Request parsing and proxy/header handling must fail safely, and privileged device setup should not be reachable by unauthenticated users who can disrupt onboarding.

### Elevation of Privilege

The main privilege boundary is between unauthenticated users and authenticated operational users, plus the boundary between ordinary dashboard access and device-provisioning capability. All privileged routes and actions must be enforced in the mobile client’s navigation flow, and onboarding should not allow arbitrary nearby devices or attackers to obtain network credentials or rewrite device destinations.
