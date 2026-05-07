# 06 — Jetpack Mechanics

The jetpack is the **headline mechanic** and the most marketable feature. It must feel
*incredible* in the hand. This document defines the model, the feel curve, and the catalog.

## The feel — what we are selling

When the player hits a jetpack pickup:

1. Time slows to **0.6×** for **180 ms**.
2. The screen flashes a colored vignette matching the jetpack rarity.
3. A whoosh + ignition layered SFX plays, doppler-shifted into the ascent.
4. The hand reaches forward, thumb hits a chrome ignition button.
5. FOV kicks from **88 → 96°** over 220 ms (eased), then back to **92°** for the duration.
6. A particle trail (rarity-dependent) unfurls behind the player.
7. Vertical control activates: tap-and-hold = climb, release = descend.
8. Sky-only collectibles (chips + epic coins) stream into view.
9. On fuel out: a sputter SFX, glide for **0.6 s**, then gentle return to ground lane.

This entire sequence is choreographed in `Jetpack/JetpackChoreographer.swift`. Every value
is balanced, not invented per scene.

## State machine

```
inactive ─▶ igniting (300ms) ─▶ flying ─▶ sputtering (600ms) ─▶ landing (400ms) ─▶ inactive
                                  │
                                  └─▶ damaged (hit hazard) ─▶ landing
```

## Inputs while flying

- **Tap-and-hold** anywhere on screen → climb at `climb_rate`.
- **Release** → descend at `gravity_air` (lighter than ground gravity).
- **Swipe left / right** → still snaps lanes (sky lanes mirror ground lanes).
- **Two-finger tap** → consumable (e.g. shield).

Vertical bounds: `y_min = 1.6 m` (one-meter-above-head clearance), `y_max = 18 m`.

## Fuel model

```
fuel(t) = fuel0 - drain * t + Σ pickup_fuel
where:
  fuel0 = jetpack.fuel_capacity      // seconds
  drain = jetpack.fuel_drain_rate    // unitless multiplier on Δt
```

Fuel pickups during flight extend duration; can never exceed `fuel_capacity * 1.25`.

When `fuel < 1.0 s`, HUD pulses red, audio low-fuel cue plays, haptic warning (medium).

## Jetpack catalog

| ID | Name | Rarity | Fuel (s) | Climb (m/s) | Drain mod | Trail | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `jp_basic_v1` | Basic Thruster | Common | 8 | 4.5 | 1.00 | white smoke | starter, free |
| `jp_neon_plasma_v1` | Neon Plasma | Rare | 11 | 5.5 | 0.95 | magenta plasma | first cosmetic upgrade |
| `jp_military_v1` | Military Thruster | Epic | 14 | 6.5 | 0.92 | red flame | unlocked Battle Pass tier 30 |
| `jp_quantum_v1` | Quantum Gravity | Epic | 12 | 7.5 | 0.90 | violet ribbon | enables short hover stalls |
| `jp_dragon_v1` | Legendary Dragon | Legendary | 16 | 7.0 | 0.85 | gold + ember | season finale reward |

Each catalog entry has these tunable parameters; see `JetpackCatalog.swift`:

```
fuelCapacity:  TimeInterval        // seconds
climbRate:     Float               // m/s
descendRate:   Float               // m/s while not climbing
fuelDrainRate: Float               // multiplier on Δt
boostFactor:   Float               // forward speed multiplier while flying
maneuverDamping: Float             // higher = stiffer feel; ≈ 6.0 default
trail:         TrailPreset         // pooled particle preset id
ignitionAudio: AudioCueId          // sample
loopAudio:     AudioCueId          // looped sample
sputterAudio:  AudioCueId          // sample
hapticIgnition: HapticPattern      // .heavy + .rigid
```

## Upgrade ladder (per jetpack)

| Level | Effect | Cost (Bytes) |
| --- | --- | --- |
| 1 | base stats | – |
| 2 | +5 % fuel capacity | 5 000 |
| 3 | +10 % fuel capacity | 12 000 |
| 4 | +5 % climb | 25 000 |
| 5 | +10 % climb, custom ignition glyph | 50 000 |

A duplicate jetpack acquired through purchase, mission, or BP grants 1 upgrade level (max 5).

## Sky lanes

When flying, the world adds an upper layer of pickups + light obstacles:

- **Drone swarms** — slalom through.
- **Holographic billboards** — slide-through earns combo.
- **Sky coins** — denser by 1.7× than ground coins.
- **Chip prisms** — rare hard-currency drops.
- **Antenna tops** — hard hazard, cause crash.

## Rarity & drop rules

Rarity rolls obey a transparent published table (anti-loot-box pattern).

| Source | Common | Rare | Epic | Legendary |
| --- | --- | --- | --- | --- |
| Run pickup | 70 % | 25 % | 5 % | 0 % |
| Daily reward | 50 % | 35 % | 14 % | 1 % |
| Battle pass tier reward | 0 % | 50 % | 45 % | 5 % |
| Event finale | 0 % | 0 % | 60 % | 40 % |

Rolls are server-authoritative; client receives the result, never makes the decision.

## Engineering contract

`JetpackSystem` lives in `NeonRunner/Game/Jetpack/` and exposes:

```swift
public protocol JetpackSystem: AnyObject {
    var state: JetpackState { get }
    var fuelRemaining: TimeInterval { get }
    var equipped: JetpackCatalogEntry { get }

    func equip(_ entry: JetpackCatalogEntry)
    func ignite(at time: GameTime)
    func tick(dt: TimeInterval, input: JetpackInput, time: GameTime)
    func addFuel(seconds: TimeInterval)
    func damage()
}
```

It publishes events on `EventBus`:

- `.jetpackIgnited(catalogId)`
- `.jetpackFuelLow`
- `.jetpackSputter`
- `.jetpackLanded(durationFlown:, distanceFlown:, coinsCollected:)`

Audio + VFX subscribe; `GameSession` records achievements and missions; HUD updates fuel
meter via `@Observable` props.

## Tuning loop

1. Telemetry: average flight duration per jetpack tier, deaths per minute during flight,
   pickup-to-ignite latency.
2. Bi-weekly remote-config rebalance through `/remote-config` endpoint without an app
   update. See [15-liveops.md](15-liveops.md).
