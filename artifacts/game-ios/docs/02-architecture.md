# 02 — System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  iOS App                                     │
│                                                                              │
│  ┌────────────┐   ┌──────────────────────────────┐   ┌───────────────────┐   │
│  │  SwiftUI   │   │         Game Runtime         │   │     Services      │   │
│  │            │   │                              │   │                   │   │
│  │  Menus     │◀──│  GameLoop ── fixed 60 Hz     │──▶│ BackendClient     │   │
│  │  HUD       │   │     │                        │   │ GameCenter        │   │
│  │  Shop      │   │     ├── Input                │   │ IAP (StoreKit 2)  │   │
│  │  Battle    │   │     ├── Player + Camera      │   │ Analytics         │   │
│  │  Pass      │   │     ├── ChunkStreamer        │   │ CloudSave (CK)    │   │
│  │  Leaders   │   │     ├── Obstacle/Pickup      │   │ Push (UN + APNs)  │   │
│  │  Settings  │   │     ├── Jetpack              │   │ RemoteConfig      │   │
│  └────────────┘   │     ├── PowerUps             │   └─────────┬─────────┘   │
│         ▲         │     ├── Score/Combo          │             │             │
│         │         │     ├── AudioDirector        │             ▼             │
│         │         │     └── VFX                  │   ┌───────────────────┐   │
│         │         └──────────────┬───────────────┘   │   Persistence     │   │
│         │                        │                   │   (UserDefaults + │   │
│         │                        ▼                   │   GRDB SQLite)    │   │
│         │              ┌───────────────────┐         └───────────────────┘   │
│         └──────────────│   GameSession     │                                 │
│                        │   (state + bus)   │                                 │
│                        └───────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                              │ HTTPS + JWT
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            game-backend (Express)                            │
│                                                                              │
│  /api/game/auth/guest      → JWT issuance + Apple-token exchange             │
│  /api/game/profile         → load + cloud sync                               │
│  /api/game/runs            → POST run results, anti-cheat validate           │
│  /api/game/leaderboards    → global / country / weekly / friends             │
│  /api/game/missions        → daily / weekly                                  │
│  /api/game/battlepass      → progress, reward claims                         │
│  /api/game/store           → store items + receipt validation                │
│  /api/game/remote-config   → balance flags & event windows                   │
│                                                                              │
│              ┌──────────────────┐    ┌──────────────────┐                    │
│              │   PostgreSQL     │    │     Redis        │                    │
│              │  (Drizzle ORM)   │    │  (leaderboards   │                    │
│              │                  │    │   ZSETs, cache)  │                    │
│              └──────────────────┘    └──────────────────┘                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Layering rules

The app is organized in concentric rings. Outer rings depend on inner rings, never the
reverse. Verified at compile time using Swift modules + a small `swiftpackage` lint script.

```
┌─────────── UI (SwiftUI)            views, view models, design system ───────────┐
│  ┌──────── Game Runtime            simulation, scene, input ─────────────┐      │
│  │  ┌───── Services                I/O: backend, IAP, GameCenter ────┐   │      │
│  │  │  ┌── Persistence + Models    pure data, no I/O ────────────┐   │   │      │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │      │
│  │  └──────────────────────────────────────────────────────────────┘   │      │
│  └────────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Persistence + Models** know nothing about UIKit/SwiftUI/Combine.
- **Services** know about `Foundation` and the network. They expose `async` APIs returning
  pure model types.
- **Game Runtime** uses SceneKit/Metal but exposes `@MainActor` façade types
  (`GameSession`) to the UI.
- **UI** observes `GameSession` via `@Observable` (Swift 5.9 macro). UI never touches the
  network directly — always through a service.

## Concurrency model

- Simulation runs on **`MainActor`** for now (SceneKit is main-thread bound). The chunk
  streamer prebuilds geometry on a background queue and hands MTLBuffers to the main thread.
- Network and disk I/O use **structured concurrency** (`async let`, `TaskGroup`).
- A single global `EventBus` broadcasts gameplay events to UI/HUD/audio/analytics. The bus
  is **synchronous and main-thread** to avoid ordering issues; subscribers must return
  fast (<100 µs) or hop to their own queue.

## Frame budget (60 fps target)

Total budget per frame: **16.6 ms**.

| System | Budget |
| --- | --- |
| Input + simulation tick | 1.0 ms |
| Chunk streamer (amortized) | 0.5 ms |
| SceneKit render | 11.0 ms |
| Post-FX (motion blur, bloom, vignette) | 2.5 ms |
| HUD compositing | 0.6 ms |
| Audio + haptics | 0.3 ms |
| Slack | 0.7 ms |

ProMotion (120 fps) targets halve the render budget; we drop motion-blur quality to **Low**
and the streamer batches bigger chunks.

## State machine

The session lives in a small finite state machine driven by `GameSession.state`:

```
idle ──▶ countdown ──▶ running ──▶ dying ──▶ revivePromptResult ──▶ ended
                          ▲                          │
                          └──────────────────────────┘ (revived)
```

UI observes state and animates transitions. The runtime listens for state changes and pauses
the loop in `idle` / `revivePromptResult` / `ended`.

## Why `@Observable` instead of `ObservableObject`

- Granular observation: only views reading a specific property re-render.
- Removes `@Published` boilerplate.
- Plays nicely with the new SwiftUI `Observation` framework (iOS 17+) which is our floor.

## Save game

- **Local** (instant): `UserDefaults` for settings + tiny last-run cache. **GRDB SQLite** for
  inventory, mission progress, run history (last 100 runs).
- **Remote** (eventual): batched upload of profile delta on session-end + on app
  background. Conflict resolution: server-authoritative for currency + leaderboard, client-
  authoritative for cosmetic equip state.
- **CloudKit private DB** mirrors the SQLite snapshot for cross-device install recovery.

## Anti-cheat

A run posted from the client is treated as **untrusted**. The server replays the run from a
seed + an event log (compact CBOR) and recomputes score. Mismatch beyond tolerance ⇒ score
rejected, soft account flag, run hidden from leaderboard. See [05-leaderboard.md](05-leaderboard.md).

## Build configurations

| Config | Purpose | Backend | Cheats |
| --- | --- | --- | --- |
| `Debug` | Local dev | `http://localhost:8787` | enabled |
| `Beta` | TestFlight | `https://api.staging.neonrunner.app` | gated by build flag |
| `Release` | App Store | `https://api.neonrunner.app` | disabled |

Compile-time flags via `.xcconfig` files keep secrets out of the repo. See
[11-tech-stack.md](11-tech-stack.md).
