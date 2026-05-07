# 10 — Development Roadmap & Sprint Planning

A realistic ~32-week plan from greenlight to global App Store launch.

## Phases

| Phase | Weeks | Goal | Exit criteria |
| --- | --- | --- | --- |
| 0. Pre-production | 1–2 | Pillars, paper design, tech spike | one-pager + tech demo runs in 60 fps |
| 1. Vertical slice | 3–8 | One biome, one jetpack, full loop | 3-min looped session feels great in a focus group |
| 2. Production | 9–22 | All biomes, all jetpacks, full meta | feature-complete, internal alpha |
| 3. Soft-launch | 23–28 | Beta + tuning | KPIs hit thresholds in 3 markets |
| 4. Global launch | 29–32 | Marketing + live | day-one stability, top-100 in arcade in 2+ regions |

## Sprint plan (2-week sprints)

### Sprint 0 (week 1–2) — Pre-production

- One-page game design (this doc tree).
- Tech spike: SceneKit chunk streamer at 60 fps with 1k draw calls.
- Vertical-slice scope freeze.
- Risk register.

### Sprint 1 (3–4) — Engine bones

- App shell + navigation + design system.
- Fixed-timestep loop, first-person camera, head-bob.
- Procedural chunk streamer v0 (3 lanes, flat ground, primitive obstacles).
- Input handler with swipe gestures + lane snap.
- Smoke test: a player can run forward and dodge for 60 s.

### Sprint 2 (5–6) — Vertical slice gameplay

- Score + combo system.
- 6 obstacle archetypes (low bar / barrier / drone / fence / pit / billboard).
- Coins + Coin Magnet + Shield power-ups.
- HUD v1 with score, combo, distance.
- Crash + revive flow (no ad yet).

### Sprint 3 (7–8) — Vertical slice polish + jetpack v0

- Basic jetpack + sky lane variant.
- Audio director + adaptive intensity.
- VFX layer: bloom, motion blur, vignette.
- Main menu with TAP TO RUN + portrait preview.
- Internal play-test (10 people, 30-min sessions). **Decision gate**: greenlight to
  production.

### Sprints 4–6 (9–14) — Production: content build-out

- 3 more biomes (rooftop, subway, sky).
- Remaining jetpack catalog.
- Remaining power-ups (10 total).
- End-of-run summary screen with breakdown.

### Sprints 7–8 (15–18) — Production: meta

- Player profile + cloud save.
- Daily missions + weekly missions + reroll.
- Battle pass v1 (free + premium tracks).
- Shop + StoreKit 2 + receipt validation.

### Sprints 9–10 (19–22) — Production: online

- Backend deploy + Redis leaderboards.
- Anti-cheat replay worker.
- Game Center, friends leaderboard.
- Analytics + dashboards (Mixpanel + own metrics).
- Push notifications + Live Activities.

### Sprints 11–13 (23–28) — Soft-launch

- Markets: Netherlands, Canada, Philippines, New Zealand.
- TestFlight ramp 100 → 5 000 → 50 000.
- Tune curves: speed, drop tables, mission difficulty.
- Crash-free sessions ≥ 99.7 % before launch.
- Day-1 retention ≥ 45 %, Day-7 ≥ 22 %, Day-30 ≥ 9 %.

### Sprint 14–16 (29–32) — Launch

- App Store featuring pitch deck, video preview, screenshots.
- Influencer / TikTok push (50 first-person clip creators).
- Day-one playable content: Season 1 Battle Pass live.
- War-room rotation, on-call schedule.

## Team capacity assumed

| Role | FTE |
| --- | --- |
| Lead iOS Engineer | 1.0 |
| Gameplay Engineer (Swift/SceneKit) | 1.0 |
| Backend Engineer | 1.0 |
| 3D Environment Artist | 1.0 |
| 3D Character/Hands/VFX Artist | 1.0 |
| UI/UX Designer | 0.5 |
| Audio Designer | 0.5 |
| Game Economy Designer | 0.5 |
| LiveOps / Producer | 0.5 |
| QA | 1.0 (ramps to 2.0 in soft-launch) |
| ASO / Marketing | 0.5 |

Total ≈ 8.0 FTE for ~32 weeks.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| FPS readability hard | Med | High | early focus tests, vignette + obstacle telegraphing tuned in S2 |
| Anti-cheat under-engineered | Med | High | dual-implement simulator (Swift + TS) early, port to Rust+WASM in v2 |
| Frame budget blown by post-FX | Med | Med | quality presets + ProMotion fallback paths |
| App Store rejection (loot box) | Low | Critical | no randomness in IAP, odds tables published |
| Chunk streamer hitches | Med | Med | precompiled MTLBuffers + 2-frame ring buffer |
| Soft-launch KPIs miss D7 22% | Med | High | budgeted 6 weeks of soft-launch tuning, not 2 |
| Game Center friends API quirks | Med | Low | fall back to friend codes |
| Battery drain | Low | Med | profile in S3, set 60 fps default unless plugged in |

## Definition of done (per feature)

- Unit tests for deterministic logic (RNG, score, missions).
- Manual checklist passes on iPhone 12, 14, 15, 16 Pro Max.
- Telemetry events wired and visible in dashboard within 5 min of action.
- Accessibility pass: VoiceOver labels, reduced-motion variant.
- Localized strings (English baseline + 1 partner locale per launch wave).
- Crash-free in 1 hour of focused QA play.
