# 01 — Game Design

## High-concept pitch

> *Mirror's Edge* meets *Subway Surfers*. You are a rogue courier in a neon megacity. Sprint
> through rooftops, subway tunnels, and sky lanes in pure first person. Slide under drones,
> vault over barricades, ignite a jetpack, and chase the global high score.

One sentence: **the first endless runner that feels like a console FPS in your pocket.**

## Why first person?

Most endless runners (Subway Surfers, Temple Run, Crash Royale) rely on a third-person
camera so the obstacle horizon is readable. We invert that:

- **Immersion**: putting the camera on the player's eyes triples perceived speed and creates
  TikTok-shareable near-miss moments.
- **Differentiation**: there is no #1 first-person endless runner on iOS. White space.
- **Hand presence**: visible gloves and a forward-pumping arm sell weight and physicality.
- **Jetpack drama**: a first-person jetpack lift is one of the most visceral feelings in
  mobile games (see *Vector*, *Sky Dancer*).

To preserve readability we use:

- A **wide FOV (88° base, 96° during boost)**.
- **Telegraphing**: every obstacle has a 700–1100 ms approach with audio + light cue.
- **Vignette compression** to keep the action centered on the lane triangle.
- **Auto-snap lane interpolation** so swipes feel decisive, not floaty.

## The 60-second core loop

```
TAP PLAY  →  3-2-1 GO  →  RUN  →  CRASH or RUN OUT OF FUEL  →  REWARDS  →  REPLAY
   ▲                                                                          │
   └──────────────────────── 30-90s avg session ────────────────────────────┘
```

Each run gives:
- **Distance + Coins + XP + Mission progress**
- **Battle Pass progress**
- **Daily Streak tick**
- **Leaderboard delta animation** (only if player improved)

## The 7-day macro loop

| Day | Hook | Notes |
| --- | --- | --- |
| 1 | Tutorial run + first jetpack feel + first cosmetic unlock | Power-curve set so first run is a personal best. |
| 2 | Daily login → free common skin | Builds streak habit. |
| 3 | First **timed mission** (e.g. "slide 50 m in one run") | Drives skill ceiling discovery. |
| 4 | Battle pass tier 5 reward (epic glove cosmetic) | First "wow" cosmetic, share-worthy. |
| 5 | Limited-time event teaser | Push notification, FOMO. |
| 6 | Friends-leaderboard beat alert | Social pull. |
| 7 | Weekly tournament reward | Glory + currency. |

## Pillars (what we will not compromise)

1. **Buttery 60 / 120 fps** — every system has a frame budget. See [02-architecture.md](02-architecture.md).
2. **One-thumb playability** — every gesture is reachable from a 6.7" iPhone with one hand.
3. **Cinematic moment density** — at least 1 "wow" moment per 15 s of run (jetpack lift, near miss, drone explosion, weather flip).
4. **No pay-to-win** — currency cannot buy distance, score multipliers, or revives that are not also earnable in-game in the same week.
5. **Respect the player** — no dark patterns, no friend-spam, ATT-honest analytics, GDPR clean.

## Controls

| Gesture | Action |
| --- | --- |
| Swipe left / right | Snap to adjacent lane (3 lanes total). |
| Swipe up | Jump. Hold = higher jump (wall-run on adjacent walls). |
| Swipe down | Slide. Hold = longer slide. |
| Two-finger tap | Activate equipped consumable (e.g. revive shield). |
| Tilt (optional) | Subtle lean for cosmetic camera roll. Off by default. |
| Tap-and-hold during jetpack | Climb. Release = descend. |

Settings allow:
- **Swipe sensitivity** (3 presets)
- **Lane snap speed** (3 presets)
- **Left-handed HUD** (mirrors action chips)
- **Reduced motion** (kills FOV kick + camera roll)

## Difficulty curve

Speed and obstacle density follow a soft logistic curve:

```
v(t)        = v0 + (v_max - v0) * (1 - exp(-t / tau))
density(t)  = clamp(d0 + alpha * sqrt(t), d0, d_max)
hazard_mix  = stage(t)   // discrete stage transitions every 60–90s
```

`v0 = 12 m/s`, `v_max = 28 m/s`, `tau = 110 s`. Hazards rotate through stages so a 10-minute run
visits 6–7 distinct biomes.

## Failure & revival

- One **free** revive per run via rewarded video (capped at 2 per run, 3 per day).
- One paid revive available with **soft currency** (Bytes), price escalates per run.
- Revival is *cinematic*: time freezes on near miss, hand reaches forward, jetpack micro-burst,
  player resumes. **Never** instant-replay; it must feel earned.

## Anti-frustration design

- First 3 runs are seeded with a friendly RNG (no double-stacked obstacles).
- After 3 deaths in a row at the same speed band, the next run grants a free shield for 8 s.
- Rage-quit detection: if the user closes the app within 5 s of dying, the next session opens
  on a softer curve and a "free coin doubler" gift.

## Accessibility

- **Colorblind modes**: deuteranopia / protanopia / tritanopia LUTs applied to coin + hazard
  palettes, never to brand UI.
- **High-contrast** outline mode for obstacles.
- **Reduced motion**: kills bobbing, FOV kick, particle storm.
- **Subtitles for audio cues** (a small "⚠ DRONE LEFT" chip 1 s before unseen hazard).
- **Haptics intensity**: 4 levels.
- **One-handed left or right** layout flip.

## Why this game will retain

- **Tight feedback loops** (combo, near miss, coin streak — all sub-second).
- **A cosmetic chase** (gloves, jetpacks, trails, taunts) — the brain wants the next drop.
- **A social pull** (friends leaderboard delta on the home screen).
- **A schedule** (daily missions, weekly tournament, monthly battle pass, seasonal theme).
- **A skill ceiling** (advanced players unlock wall-run, drift-slide, jetpack barrel roll).
