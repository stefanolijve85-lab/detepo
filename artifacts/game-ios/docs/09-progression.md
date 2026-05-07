# 09 — Progression & Battle Pass

## Pillars

1. **Always be earning.** Every run produces visible progression on at least 3 tracks.
2. **Mid-session drops** are common, **end-of-week drops** are exciting, **seasonal drops**
   are flexes.
3. **Show, don't sell.** Cosmetics drive identity and retention, never raw power.

## Progression tracks

| Track | Cadence | Reward type |
| --- | --- | --- |
| **Player Level** | run + mission XP | profile flair, level-up gift bundles |
| **Battle Pass** | seasonal (50 days) | free + premium tier rewards |
| **Daily Missions** | 3 daily, refresh 04:00 local | Bytes, Chips, BP XP |
| **Weekly Missions** | 5 weekly, refresh Mon | bigger rewards + cosmetic |
| **Achievements** | lifetime | titles, frames, Game Center |
| **League** | weekly tournament | cosmetic + Chips, promotion / relegation |
| **Streak** | daily login | escalating bundle on 3, 7, 14, 30 |
| **Prestige** | reset at level 100 | prestige flair color, vanity title |

## XP curve

```
xp_to_next(level) = 200 * level * sqrt(level)
```

| Level | XP | Cumulative |
| --- | --- | --- |
| 1 | 200 | 200 |
| 5 | 2 236 | 8 380 |
| 10 | 6 324 | 41 200 |
| 25 | 25 000 | 350 000 |
| 50 | 70 711 | 1 750 000 |
| 100 | 200 000 | 9 800 000 |

Level rewards every level (Bytes), gift bundles every 5 levels (Chips + cosmetic).

## Battle Pass

50 tiers per 50-day season (1 tier ≈ 1 day for engaged players).

```
bp_xp_per_tier = 1000  // constant for clarity
```

Free track: 50 tiers, ~30 of which give a tangible item (Bytes / mission scroll / common
cosmetic / trail).

Premium track: 50 tiers, ~45 with items: 1 epic jetpack, 1 legendary jetpack at tier 50, 6
epic gloves, 12 trails, 4 taunts, 1 800 Chips spread out (more than the cost), animated
profile frame.

**Premium pass cost: 999 Chips ≈ $9.99.** Premium-plus ($19.99) adds 25 tier skips.

**Premium-back guarantee**: if a player completes the premium pass, they get back **1 200
Chips** in addition to all rewards — slightly more than the cost. This keeps engaged buyers
re-buying every season (industry standard since *Fortnite*).

## Mission system

Three daily missions roll at 04:00 local from a weighted pool. Examples:

| Mission ID | Description | Target | Reward |
| --- | --- | --- | --- |
| `mn_distance_1500` | Run 1 500 m in a single run | 1 500 m | 500 B / 50 BP XP |
| `mn_combo_15` | Reach combo ×15 | 15 | 700 B / 75 BP XP |
| `mn_jetpack_30s` | Fly 30 s in jetpack | 30 s | 600 B / 60 BP XP |
| `mn_near_miss_25` | 25 near misses in a session | 25 | 550 B / 55 BP XP |
| `mn_slide_50m` | Slide 50 cumulative m | 50 m | 400 B / 40 BP XP |
| `mn_coins_300` | Collect 300 coins | 300 | 350 B / 35 BP XP |
| `mn_biome_visit` | Visit Sky City biome | 1 | 600 B / 60 BP XP |

Reroll cost: 100 Bytes, max 1 reroll per mission per day. Ad-watch reroll: 1 free per day.

## Achievements (sample)

- *Cyber Initiate* — finish your first run
- *Combo Specialist* — reach combo ×30
- *Sky High* — fly 60 s in a single run
- *Megacity Explorer* — visit all 6 biomes
- *Glove Collector* — own 25 glove cosmetics
- *Streak Year* — 365-day login streak (a tongue-in-cheek mountain)
- *No Hands* — finish a run without taking damage in a 10-mission week

Achievements mirror to Game Center for native iOS surfacing.

## League system

Weekly. Promotion every 4 wins, relegation every 5 losses (a "win" = top 50 % of bracket
this week).

| League | Promotion threshold | Reward |
| --- | --- | --- |
| Bronze I → III | bottom 50 % of week | 200 B |
| Silver I → III | top 50 % | 400 B + 5 Chips |
| Gold I → III | top 30 % | 800 B + 15 Chips + glove cosmetic |
| Platinum I → III | top 15 % | 1 500 B + 30 Chips + trail |
| Diamond | top 5 % | 3 000 B + 60 Chips + season epic |
| Champion | top 0.5 % | 5 000 B + 150 Chips + animated profile |

Each league is a separate Redis ZSET; brackets are 100-player groups bucketed at
season-week start.

## Daily login streak

| Day | Reward |
| --- | --- |
| 1 | 100 Bytes |
| 2 | 200 Bytes |
| 3 | 1 Chip + 300 Bytes |
| 4 | 400 Bytes |
| 5 | 500 Bytes |
| 6 | 600 Bytes |
| 7 | **5 Chips + Common cosmetic + Common cosmetic upgrade scroll** |
| 14 | **15 Chips + Rare jetpack upgrade scroll** |
| 30 | **50 Chips + Legendary trail** |

Streak resets if a day is missed; we forgive **one** miss per month (free "streak freeze"
auto-applied to keep retention smooth).

## Prestige

At level 100, optional prestige reset: level → 1, XP curve unchanged, prestige rank +1, all
inventory kept, profile flair gains gold border with prestige number. No mechanical
advantage, pure flex.

## Visual progression

Every progression event is **felt**:

- Level up: full-screen neon shockwave, light haptic, audio sting.
- Mission complete: corner toast + coin + soft chime.
- Battle pass tier up: confetti rays + rarity-specific particle burst.
- Achievement: Game Center banner + custom haptic + sting.
- League promotion: cinematic transition between matches showing new league badge.

## Anti-grind safeguards

- Mission pool weighted to player skill (telemetry-driven). New players never see "combo
  ×30" until their personal best combo > ×15.
- Daily cap on rewards from the same source (e.g. cannot farm one mission infinitely if
  the daily roll is lucky).
- Bundle rewards always include at least one cosmetic, never pure currency, to avoid the
  "treadmill" feeling.
