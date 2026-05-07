# 16 — Future Expansion Roadmap

A 24-month outlook past launch. The architecture is designed to absorb each of these
without a teardown.

## Year 1 (post-launch)

### Q1 — Stability + first cycle of seasons (Seasons 1–2)

- Fix top-3 crashes from launch.
- Tune curves based on D7/D30 cohort data.
- Roll out **Live Activity** end-of-run summary on lock screen.
- Add **AirPods spatial audio** custom HRTF profiles.

### Q2 — Multiplayer Ghosts (Season 3)

- Async multiplayer: race against the **ghost** of a friend's best run, rendered from the
  event log.
- Server replays event log on demand; client interpolates into a translucent ghost runner.
- No latency-critical netcode required.
- Adds a powerful social hook without a real-time multiplayer server.

### Q3 — Android port (Season 4)

- Port simulation to Unity (the engine-agnostic data + systems separation pays off here).
- Re-author the 6 biomes to URP shaders (one art week per biome).
- Reuse 100 % of the backend.
- Soft-launch in Asia first to capture Snapdragon 8 Gen 3 / Tensor G4 cohort.

### Q4 — Live multiplayer "Crew Run" (Season 5)

- 4-player asynchronous co-op: each player runs a *parallel lane* in the same neon city.
  Score is summed; team competes on a separate leaderboard.
- Authoritative server tick at 20 Hz, client interpolation at 60 Hz.
- New "Crew" social object: persistent 4-friend group with team currency, shared missions.

## Year 2

### Q5 — Daily Custom Run

- Apple Shortcuts integration: ask Siri "play my morning run" → custom seed + biome combo.
- Server distributes **the same daily seed** worldwide for a "daily challenge" leaderboard
  (separate from the fairness-protected core leaderboards).

### Q6 — Creator Mode

- In-game level editor for mid-engagement players.
- Submit runs to a community queue. Top-rated runs get featured in a "Workshop" tab.
- Curated creator program with revenue share on cosmetic packs designed by community
  artists.

### Q7 — Vision Pro companion

- Spectator app: watch a friend's live run in 3D on Vision Pro.
- Eventual: a Vision Pro version of the runner with hand-tracked obstacle dodging (out of
  scope for this doc — separate game design).

### Q8 — Esports

- Monthly invitational tournament with $50 000 prize pool.
- Anti-cheat simulator must be Rust+WASM by then; current TS implementation is a v1
  scaffold.
- Spectator mode: cinematic camera director that follows the leading runner.

## Big-bet experiments (any quarter)

- **Story mode**: a 3-hour narrative campaign in the same megacity using the same engine.
  Tests whether our audience wants a *Mirror's Edge*-style scripted experience.
- **Apple Arcade variant**: ad-free, IAP-free, premium tier. Negotiate inclusion.
- **CarPlay companion**: map-style "next biome teaser" widget, plus a Game Center
  notification stream. Low-effort, high-novelty marketing surface.
- **Wear-OS / watchOS**: rewards-only widget showing streaks + BP progress.

## Architectural prerequisites

| Future feature | Required scaffolding (build now) |
| --- | --- |
| Multiplayer ghosts | event-log replays already shipped |
| Live multiplayer | extract simulation into engine-agnostic core (tracked) |
| Android port | data-driven biomes; no hard-coded SceneKit specifics |
| Creator mode | level chunks already serializable to JSON |
| Esports | strict deterministic simulation; fixed-timestep already in place |

The systems shipped in v1 already meet most of these prerequisites. No re-platforming
required for the first year of expansion.

## Ramps we will *not* take

- **Battle royale**: doesn't fit a 90-second loop, audience mismatch.
- **NFT cosmetics**: no.
- **Loot boxes**: no.
- **Pay-to-revive that doubles each run**: no — it's predatory.
- **Spammy push during quiet hours**: no.

## Sustaining content cadence

| Cadence | Output |
| --- | --- |
| Weekly | Tournament + 1 push event |
| Biweekly | Mission pool refresh; remote-config tune |
| Monthly | New cosmetic drop in shop |
| Per season (50 d) | New BP tier list, 1 epic + 1 legendary jetpack, 1 biome variant |
| Per year | New full biome, new mechanic (e.g. wall-run, slide-drift) |
