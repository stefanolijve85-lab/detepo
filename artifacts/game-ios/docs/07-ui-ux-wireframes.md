# 07 — UI/UX Wireframes

Portrait orientation only. Designed for one-thumb reach on iPhone 15/16 Pro Max (6.7"). All
mockups are ASCII-fidelity wireframes — final visuals follow the [art direction](12-art-direction.md).

## Screen map

```
SplashScreen
   │
   ▼
MainMenu ─────────┬───────────┬───────────┬───────────┬─────────┐
   │              ▼           ▼           ▼           ▼         ▼
   │           Shop      Leaderboard  BattlePass  Missions  Settings
   ▼
Countdown ──▶ Game (HUD) ──▶ EndOfRun ──▶ MainMenu
                                │
                                └─▶ ReviveModal (rewarded ad / paid)
```

## Main menu

```
┌────────────────────────────────────────────┐
│  ☰   NEON RUNNER        🪙 12,450  💎 38   │  ← top bar (status pill)
│                                            │
│       ███████████████████████              │
│       █                     █              │
│       █   PLAYER PORTRAIT   █              │  ← rotating 3D loadout preview
│       █   (live 3D, 60fps)  █              │
│       █                     █              │
│       ███████████████████████              │
│                                            │
│       ▶  TAP TO RUN                        │  ← primary CTA, neon glow
│                                            │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│   │ MISSIONS │ │ BATTLE   │ │ SHOP     │   │
│   │  3 / 3   │ │ PASS     │ │ NEW!     │   │
│   └──────────┘ └──────────┘ └──────────┘   │
│                                            │
│   ┌──────────────────────────────────────┐ │
│   │ 🏆 Friends Leaderboard         #4 → ↑│ │  ← personalized social pull
│   └──────────────────────────────────────┘ │
│                                            │
│   [HOME] [LEADER] [BATTLE PASS] [SETTINGS] │  ← bottom tab bar (4 items max)
└────────────────────────────────────────────┘
```

Animation: portrait rotates idly; coin counts increment with a subtle count-up. The "TAP TO
RUN" pill pulses with the heartbeat audio.

## Countdown overlay

3-2-1-GO over a frozen first-person view of the spawn point. 800 ms total. Skippable via
swipe-up.

## In-game HUD (running)

```
┌────────────────────────────────────────────┐
│  ⏱ 00:42        DISTANCE 1,427m       🔥 ×7│  ← top: timer / distance / combo
│                                            │
│                                            │
│              [active]                      │
│              ▣ COIN MAGNET 0:08            │  ← top-left power-up stack
│              ▣ DOUBLE COINS 0:04           │
│                                            │
│                                            │
│                                            │
│                                            │
│         (gameplay viewport)                │
│                                            │
│                                            │
│                                            │
│                                            │
│   ⚡ JETPACK FUEL ▰▰▰▰▰▱▱▱▱▱   8.2s         │  ← bottom-left when flying
│                                            │
│   🪙 412         SCORE 28,950        ▼MENU │  ← bottom: coins / score / pause
└────────────────────────────────────────────┘
```

- All HUD elements respect the device's safe area + notch / Dynamic Island clearance.
- During Dynamic Island display, the score widget pops out into a Live Activity.
- HUD opacity drops to 70 % during cinematic moments (jetpack ignition).

## End-of-run

```
┌────────────────────────────────────────────┐
│            RUN COMPLETE                    │
│                                            │
│   🏆 NEW PERSONAL BEST                     │
│      28,950   (+4,120 from last)           │
│                                            │
│   DISTANCE   1,427 m                       │
│   COINS      412 → +824 (× Double Coins)   │
│   COMBO MAX  ×11                           │
│   NEAR MISS  37                            │
│                                            │
│   GLOBAL RANK   #18,402  (▲ 1,204)         │
│   COUNTRY  NL   #623     (▲ 41)            │
│   FRIENDS       #2  (1 to beat: SK_R34CH)  │
│                                            │
│   ┌───────────────┐  ┌───────────────┐     │
│   │ ▶  RUN AGAIN  │  │ 🎁 +500 BYTES │     │
│   │   (1-tap)     │  │ Watch ad      │     │
│   └───────────────┘  └───────────────┘     │
│                                            │
│   [Share clip]   [Home]   [Missions]       │
└────────────────────────────────────────────┘
```

## Revive modal

Triggered on death. 5-second countdown, then auto-dismiss back to End-of-run.

```
┌────────────────────────────────────────────┐
│           CONTINUE YOUR RUN?               │
│              ⏱ 4...                        │
│                                            │
│         [ silhouette of player ]           │
│           dramatic freeze frame            │
│                                            │
│   ┌────────────────────────┐               │
│   │  ▶ WATCH AD (free)     │  ← 1 left     │
│   └────────────────────────┘               │
│                                            │
│   ┌────────────────────────┐               │
│   │  💎 Use 50 Chips       │               │
│   └────────────────────────┘               │
│                                            │
│            [ NO THANKS ]                   │
└────────────────────────────────────────────┘
```

## Shop

Tabs: **Featured / Jetpacks / Gloves / Trails / Currency**.

```
┌────────────────────────────────────────────┐
│  SHOP                       🪙 12,450 💎 38│
│  [ Featured ][ Jetpacks ][ Gloves ][ More ]│
│                                            │
│   ╔══════════════════════════════════╗     │
│   ║   LIMITED — DRAGON JETPACK       ║     │
│   ║   ★★★★★  Legendary               ║     │
│   ║   ▶ live 3D preview              ║     │
│   ║   1,200 💎          ⏱ 02d 14h    ║     │
│   ╚══════════════════════════════════╝     │
│                                            │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│   │NEON  │ │MILITE│ │QUANT │ │GLV-N │      │
│   │PLASM │ │THRUST│ │ GRAV │ │ PULSE│      │
│   │ 350💎│ │ 750💎│ │ 950💎│ │ 200💎│      │
│   └──────┘ └──────┘ └──────┘ └──────┘      │
└────────────────────────────────────────────┘
```

## Battle Pass

```
┌────────────────────────────────────────────┐
│  BATTLE PASS — SEASON 1: NEON GENESIS      │
│  Tier 12 / 50      ▰▰▰▰▰▰▱▱▱▱  720/1000 XP│
│  ⏱ 18 days remaining    [ UPGRADE 999💎 ]  │
│                                            │
│  ───────────── FREE ─────────────          │
│  T11 ✅   T12 ▶   T13 🔒  T14 🔒           │
│  ───────── PREMIUM ──────────              │
│  T11 🔒   T12 🔒   T13 🔒  T14 🔒           │
│                                            │
│  ▶ Tier 12 reward: COIN MAGNET ×3          │
│  ▶ Premium tier 12: NEON GLOVES (Epic)     │
│                                            │
│  [ CLAIM ALL ]  [ HOW IT WORKS ]           │
└────────────────────────────────────────────┘
```

## Leaderboard

```
┌────────────────────────────────────────────┐
│  LEADERBOARD                               │
│  [ GLOBAL ][ COUNTRY 🇳🇱 ][ FRIENDS ][ EVENT]│
│  WEEK 19 — ⏱ ends in 3d 4h                 │
│                                            │
│  #1  RUNN3R_AKI   🇯🇵    1,204,500         │
│  #2  ZEROX_PRO    🇺🇸    1,180,990         │
│  #3  HEXAGON      🇩🇪    1,144,800         │
│  ...                                       │
│  #18,402  YOU             28,950   (▲)     │
│  #18,403  SK_R34CH        28,500           │
│                                            │
│  [ LEAGUE: GOLD III ▶ promote in 4 wins ]  │
└────────────────────────────────────────────┘
```

## Settings

```
┌────────────────────────────────────────────┐
│  SETTINGS                                  │
│                                            │
│  GAMEPLAY                                  │
│   Swipe sensitivity      [ Standard ▾ ]    │
│   Lane snap speed        [ Quick ▾ ]       │
│   Left-handed HUD        [ ◯◑◯ ]            │
│                                            │
│  ACCESSIBILITY                             │
│   Reduced motion         [ Off ]           │
│   Colorblind mode        [ Off ▾ ]         │
│   High contrast          [ Off ]           │
│   Subtitles for cues     [ On  ]           │
│   Haptics intensity      [ ●●●○ ]          │
│                                            │
│  GRAPHICS                                  │
│   Frame rate             [ 120 ▾ ]         │
│   Quality preset         [ Ultra ▾ ]       │
│   Motion blur            [ On ]            │
│                                            │
│  AUDIO                                     │
│   Master                 [▰▰▰▰▰▰▱▱]         │
│   Music                  [▰▰▰▰▱▱▱▱]         │
│   SFX                    [▰▰▰▰▰▰▱▱]         │
│                                            │
│  ACCOUNT                                   │
│   Sign in with Apple      [ ▶ ]            │
│   Game Center             [ ✅ Linked ]    │
│   Restore purchases       [ ▶ ]            │
│   Export my data (GDPR)   [ ▶ ]            │
│   Delete my account       [ ▶ ]            │
│                                            │
│  ABOUT                                     │
│   Version 1.4.0 (build 423)                │
│   Privacy / Terms / Open source licenses   │
└────────────────────────────────────────────┘
```

## Motion language

- **Spring damping**: 0.78 default. Buttons settle quickly without bounce.
- **Easing**: cubic out for entrances, cubic in for exits, ease-in-out for value tickers.
- **Stagger**: 40 ms between adjacent list items in a grid reveal.
- **Loading**: never a static spinner — always a shimmering gradient placeholder card.
- **Haptics**: every primary tap = `.medium impact`. Currency increment = `.selection`. Personal
  best = `.notificationSuccess`.

## Live Activities + Dynamic Island

During a run, expose:
- compact: `🏃 1,427m`
- expanded: `1,427m  ×7  🪙412`
- minimal: combo ×N

This gives players a glanceable HUD even when they accidentally swipe to home — and is huge
for TikTok-style screen recordings.
