# NEON RUNNER — First-Person Endless Runner for iOS

> **Codename:** `NeonRunner`
> **Genre:** First-person endless runner / arcade
> **Platforms:** iOS 17+ (iPhone 12 and newer; tuned for iPhone 15/16)
> **Engine:** Native (Swift + SwiftUI + SceneKit + Metal post-FX). Unity port path documented.
> **Orientation:** Portrait
> **Frame rate target:** 60 FPS baseline, 120 FPS on ProMotion devices
> **Network:** Online leaderboards + cloud save + LiveOps; gameplay is fully offline-playable.

This artifact is the production scaffold of *Neon Runner* — an addictive, cinematic first-person
endless runner inspired by *Mirror's Edge*, *Temple Run*, *Subway Surfers*, and *Jetpack Joyride*,
built for the modern App Store.

It is **not** a throwaway prototype. The folder structure, naming, separation of concerns,
service contracts, telemetry hooks, and economy model are all designed to scale to a live,
top-grossing arcade game.

---

## What's in this artifact

| Path | Description |
| --- | --- |
| `docs/` | The full design bible: game design, architecture, art/audio direction, economy, progression, LiveOps, launch + ASO strategy, roadmap, future expansion. **22 deliverables.** |
| `NeonRunner/App` | App entry, dependency container, root navigation, scene phase wiring. |
| `NeonRunner/Game` | The runtime engine: scene, fixed-timestep loop, first-person camera, procedural chunk streamer, obstacles, pickups, jetpack, power-ups, score/combo, adaptive audio. |
| `NeonRunner/UI` | SwiftUI: HUD, main menu, shop, leaderboard, battle pass, settings, accessibility. Design system + reusable neon components. |
| `NeonRunner/Services` | Backend client, Game Center, IAP, analytics, cloud save, push, remote config. |
| `NeonRunner/Persistence` | Local profile, inventory, settings, run history. |
| `NeonRunner/Analytics` | Event taxonomy + dispatcher. |
| `NeonRunnerTests` | Unit tests for deterministic systems (scoring, RNG, anti-cheat). |
| `../game-backend` | Companion Express + Drizzle backend (leaderboards, profiles, runs, missions, anti-cheat). |

---

## Quick links to the design bible

1. [01 — Game Design](docs/01-game-design.md)
2. [02 — System Architecture](docs/02-architecture.md)
3. [03 — Backend Architecture](docs/03-backend.md)
4. [04 — Database Schema](docs/04-database.md)
5. [05 — Leaderboards](docs/05-leaderboard.md)
6. [06 — Jetpack Mechanics](docs/06-jetpack.md)
7. [07 — UI/UX Wireframes](docs/07-ui-ux-wireframes.md)
8. [08 — Economy](docs/08-economy.md)
9. [09 — Progression & Battle Pass](docs/09-progression.md)
10. [10 — Roadmap & Sprints](docs/10-roadmap.md)
11. [11 — Tech Stack](docs/11-tech-stack.md)
12. [12 — Visual Art Direction](docs/12-art-direction.md)
13. [13 — Audio Direction](docs/13-audio-direction.md)
14. [14 — Launch Strategy & ASO](docs/14-launch-strategy.md)
15. [15 — LiveOps Strategy](docs/15-liveops.md)
16. [16 — Future Expansion](docs/16-expansion.md)

---

## Why native (Swift + SceneKit + Metal) vs Unity / Unreal

For a first-person endless runner with a tightly constrained gameplay scope, the native
Apple stack offers the lowest-friction path to a polished, low-battery, fast-launching
shipping product:

- **App size**: ~40–80 MB ship binary vs 150–250 MB for Unity Mono+IL2CPP and assets.
- **Cold start**: <1.5 s to playable on iPhone 15 vs 4–6 s typical Unity launch.
- **Battery**: SceneKit + Metal scoreboard well below Unity equivalent on identical scene.
- **Update size**: TestFlight rev cycle in minutes, no engine recompile.
- **First-class Game Center, StoreKit 2, ASA, App Tracking Transparency, Live Activities, Dynamic Island.**

Unity remains the best path *if* we plan to ship Android day-one. The codebase is laid out
so that the **Game** layer is engine-agnostic in spirit (data + ECS-style systems) and
porting the simulation to Unity is a contained, well-defined task. See
[docs/11-tech-stack.md](docs/11-tech-stack.md#engine-decision-matrix).

---

## Reading order for new engineers

1. `docs/01-game-design.md` — what we are building and why it's fun.
2. `docs/02-architecture.md` — how the app is wired.
3. `NeonRunner/App/NeonRunnerApp.swift` — entry point.
4. `NeonRunner/Game/GameLoop.swift` — the heartbeat.
5. `NeonRunner/Game/World/ChunkStreamer.swift` — procedural generation.
6. `NeonRunner/Game/Jetpack/JetpackSystem.swift` — the headline mechanic.
7. `docs/05-leaderboard.md` + `../game-backend/src/routes/leaderboard.ts` — online stack.
