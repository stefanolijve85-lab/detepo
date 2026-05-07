# 11 — Recommended Tech Stack

## iOS

| Layer | Choice | Why |
| --- | --- | --- |
| Language | **Swift 5.9+** | Macros, `@Observable`, structured concurrency. |
| UI | **SwiftUI** | Compositional, animation-first, less surface for bugs. |
| 3D scene | **SceneKit + Metal** | First-party, low-overhead, perfect fit for tight FPS scope. |
| Post-FX | **CIFilter + custom Metal compute** | Bloom, motion blur, vignette, chromatic aberration. |
| Physics | **SceneKit physics (rigid body) + custom kinematic player controller** | We don't need full sim — kinematic is faster and predictable. |
| Audio | **AVAudioEngine** | Adaptive mixing, real-time DSP, 3D audio. |
| Haptics | **Core Haptics** | Custom AHAP patterns per event. |
| Local DB | **GRDB** (SQLite) | Production-grade, type-safe migrations. |
| Cloud save | **CloudKit** | Free, native, install-recovery. |
| IAP | **StoreKit 2** | Modern async API, JWS verification. |
| Auth | **Sign in with Apple** | Required if any non-Apple auth exists. |
| Analytics | **Mixpanel + first-party telemetry** | Mixpanel for funnels, ours for unsampled events. |
| Crash | **MetricKit + Sentry** | Free MetricKit baseline + Sentry for actionable triage. |
| Push | **UserNotifications + APNs** | Native; we own the cert path. |
| Live Activities | **ActivityKit** | Score on Dynamic Island during runs. |
| Networking | **URLSession + async/await** | No third-party HTTP client needed. |
| JSON | **Codable + custom decoder for fast paths** | Tight, no Codable on hot paths. |

## Backend

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20 LTS |
| Framework | Express 5 |
| Language | TypeScript 5.9 (strict) |
| ORM | Drizzle |
| DB | PostgreSQL 16 |
| Cache + leaderboards | Redis 7 |
| Validation | Zod |
| Queues | BullMQ on Redis |
| Object storage | S3 |
| Container | Docker / Fargate |
| CI/CD | GitHub Actions |
| Observability | OpenTelemetry → Honeycomb |

## Engine decision matrix

|  | SceneKit (chosen for v1) | Unity 2023 LTS | Unreal 5.4 |
| --- | --- | --- | --- |
| Time-to-MVP | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Bundle size | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| Cold-start | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| Battery on iOS | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Cross-platform reach | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 3D content pipeline | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Multiplayer mode (future) | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Staffing pool | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Decision**: Native SceneKit for iOS-first launch. Architect the simulation as
engine-agnostic data + systems so a Unity port can begin in parallel after MVP.

## Folder layout (iOS)

```
NeonRunner/
├── App/
│   ├── NeonRunnerApp.swift          // @main
│   ├── AppDependencies.swift        // composition root
│   ├── AppRouter.swift              // navigation
│   └── ScenePhaseObserver.swift
├── Game/
│   ├── GameSession.swift            // façade observed by UI
│   ├── GameLoop.swift               // fixed-timestep tick
│   ├── GameTime.swift
│   ├── EventBus.swift
│   ├── Player/
│   │   ├── PlayerController.swift
│   │   ├── HeadBob.swift
│   │   └── HandsRig.swift
│   ├── Input/
│   │   ├── SwipeInputHandler.swift
│   │   └── HapticEngine.swift
│   ├── Camera/
│   │   ├── FirstPersonCamera.swift
│   │   ├── FOVKick.swift
│   │   └── PostFX.swift
│   ├── World/
│   │   ├── ChunkStreamer.swift
│   │   ├── Chunk.swift
│   │   ├── Biome.swift
│   │   └── WeatherSystem.swift
│   ├── Obstacles/
│   │   └── ObstacleSpawner.swift
│   ├── Pickups/
│   │   ├── CoinNode.swift
│   │   └── PickupRegistry.swift
│   ├── Jetpack/
│   │   ├── JetpackSystem.swift
│   │   ├── JetpackCatalog.swift
│   │   └── JetpackChoreographer.swift
│   ├── PowerUps/
│   │   ├── PowerUp.swift
│   │   ├── PowerUpRegistry.swift
│   │   └── PowerUpStack.swift
│   ├── Score/
│   │   ├── ScoreSystem.swift
│   │   └── ComboTracker.swift
│   ├── Audio/
│   │   ├── AudioDirector.swift
│   │   └── AdaptiveMusic.swift
│   ├── VFX/
│   │   └── ParticleLibrary.swift
│   └── Difficulty/
│       └── DifficultyCurve.swift
├── UI/
│   ├── HUD/
│   │   ├── HUDView.swift
│   │   ├── ScoreCounter.swift
│   │   ├── ComboMeter.swift
│   │   ├── PowerUpStackView.swift
│   │   └── JetpackFuelMeter.swift
│   ├── Menu/
│   │   ├── MainMenuView.swift
│   │   ├── ShopView.swift
│   │   ├── LeaderboardView.swift
│   │   ├── BattlePassView.swift
│   │   ├── SettingsView.swift
│   │   └── EndOfRunView.swift
│   ├── Components/
│   │   ├── NeonButton.swift
│   │   ├── GradientBackground.swift
│   │   ├── CountUpText.swift
│   │   └── RarityChip.swift
│   └── Theme/
│       └── DesignSystem.swift
├── Services/
│   ├── BackendClient.swift
│   ├── LeaderboardService.swift
│   ├── GameCenterService.swift
│   ├── IAPService.swift
│   ├── CloudSaveService.swift
│   ├── PushService.swift
│   └── RemoteConfigService.swift
├── Persistence/
│   ├── PlayerProfile.swift
│   ├── ProfileStore.swift
│   └── RunHistoryStore.swift
├── Analytics/
│   ├── AnalyticsEvent.swift
│   └── AnalyticsDispatcher.swift
└── Resources/
    └── (assets — .scn, .usdz, .wav, .ahap, Localizable.strings)
```

## Folder layout (backend)

```
artifacts/game-backend/
├── src/
│   ├── server.ts
│   ├── env.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── runs.ts
│   │   ├── leaderboards.ts
│   │   ├── missions.ts
│   │   ├── battlepass.ts
│   │   ├── store.ts
│   │   └── remoteConfig.ts
│   ├── services/
│   │   ├── leaderboard.ts
│   │   ├── runValidator.ts
│   │   ├── missionEngine.ts
│   │   ├── battlepassEngine.ts
│   │   └── storeKit.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── idempotency.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── seeds/
│   └── validation/
│       └── runSubmission.ts
├── drizzle/                # generated migrations
├── package.json
└── tsconfig.json
```

## Build & CI

- Xcode 15.4+, Swift 5.9.
- Fastlane for TestFlight + App Store submission.
- GitHub Actions:
  - `pnpm typecheck` on every PR.
  - `swift test` on macOS runner.
  - Backend Docker build + push on `main`.
  - Drizzle `migrate:check` on `main` to detect drift.
- Branch policy: trunk-based with short-lived feature branches; Fastlane lane
  `nightly_testflight` runs at 02:00 UTC if `main` changed.

## Secrets management

- iOS: app-side public keys for JWT verification only; **no secrets** in the bundle.
- Backend: AWS Secrets Manager. Local dev uses `.env.local` (gitignored).
- Apple App Store Server Notifications V2 secret pulled from Secrets Manager.
- Push key (.p8) injected at boot, never logged.
