# 15 — LiveOps Strategy

A live game lives or dies on its 12-week pacing. This document defines the calendar, the
levers, the playbooks, and the metrics.

## Calendar template (50-day season)

| Week | Theme drop | Mechanic | Push moment |
| --- | --- | --- | --- |
| W1 | Season launch | Premium pass live, legendary jetpack chase | Launch broadcast push |
| W2 | First weekend event | Double Coins, 48 hours | Friday + Saturday push |
| W3 | Country tournament | Country leaderboard prize bracket | Geo-targeted push |
| W4 | Mid-season skin reveal | Premium store drop | Drop trailer push |
| W5 | Weekly mission spike | New mission category (e.g. wall-run) | New-mission push |
| W6 | Biome takeover | Limited-time biome variant (e.g. neon storm) | Trailer push |
| W7 | Friends event | Bonus rewards if you and a friend both run | Friend invite push |
| W8 | Pre-finale teaser | Roadmap reveal of next season's headliner | Hype push |
| W9 | Final tournament | Triple rewards, finale jetpack reroll | Daily reminders |

## Levers we can pull (no app update)

All of these are remote-config flags fetched from `/remote-config`.

| Lever | Effect | Window |
| --- | --- | --- |
| `coin_multiplier` | global coin earn × | per event |
| `xp_multiplier` | XP earn × | per event |
| `bp_xp_multiplier` | BP XP earn × | per event |
| `event_jetpack_drop_id` | which jetpack drops in event mode | per event |
| `weekly_tournament_pool` | reward bundle | weekly |
| `featured_iap_offer_id` | shop promo card | weekly |
| `revive_chip_cost` | dynamic pricing of paid revive | A/B + ramp |
| `mission_pool_overrides` | activate special daily missions | per event |
| `biome_weights` | shift biome drop probability | per event |
| `weather_override` | force "neon storm" | per event |
| `audio_intensity_floor` | start music drum bus higher | per event |

## Push notification strategy

We send **at most 3** push notifications/week per user. Each push has a clear purpose.

| Trigger | Window | Body |
| --- | --- | --- |
| Streak about to break | 22:00 local | "🔥 Don't lose your 6-day streak." |
| Friend beat your score | within 30 min of friend's PB | "🏎 SK_R34CH just beat you by 412." |
| Weekly tournament 12h | Sunday 12:00 local | "⏱ 12h to climb. You're #18,402." |
| BP tier 5 close | when 80 % to next tier | "🎁 1 run away from a new glove." |
| New season day-0 | global push, scheduled | "⚡ Season 2: SUNGRID is live." |
| Free gift waiting | once after 24h absence | "🎁 We saved a coin doubler for you." |

Quiet hours: 22:00 → 08:00 local. Frequency cap enforced server-side.

## A/B testing framework

Every change to balance, pricing, or pacing is gated by an experiment.

```
{
  "experiments": {
    "exp_revive_price_v3": {
      "variants": [
        { "id": "control", "weight": 50, "cost": 50 },
        { "id": "v3a",     "weight": 25, "cost": 35 },
        { "id": "v3b",     "weight": 25, "cost": 75 }
      ],
      "primary_kpi": "arpdau",
      "guardrails": ["d1_retention", "rage_quit_rate"]
    }
  }
}
```

Assignments are deterministic on `player_id`. We log assignments + outcomes; analysis is
done in our warehouse; winners promoted to the catalog after 14 days minimum.

## Event playbooks

### "Storm Run" weekend event (48 h)

- Activates a procedural neon-storm weather override on every biome.
- New temporary mission: *Survive 90 s in storm*.
- Limited-time storefront slot: epic cosmetic at -25 %.
- Push: Friday 18:00 local, Saturday 11:00 local.
- Expected: +35 % DAU, +20 % ARPDAU, +60 % session length p50.

### "Speed Trial" tournament (1 week)

- Separate ZSET `lb:event:speed_trial_<n>` with score = distance / duration.
- Top 100 globally win an animated profile frame; top 1000 win 200 Chips.
- Push: launch + final-12h reminder.
- Expected: +18 % retention, ~5 % social share rate.

### "Zero-Gravity" (1 week)

- Force gravity = 60 % everywhere; jumps higher, jetpack drains 0.7×.
- Curiosity hook for lapsed users; we re-target lapsed-7d cohort with push and tCPI ads.
- Expected: +25 % reactivation of D7+ lapsed.

## Operational KPIs

| KPI | Target | Watch every |
| --- | --- | --- |
| DAU | rising | hourly |
| ARPDAU | $0.20+ at month 1 | daily |
| Crash-free sessions | ≥ 99.9 % | hourly |
| Avg session length | 8–12 min | daily |
| Sessions/DAU | 4–6 | daily |
| Day-1 / 7 / 30 retention | 50 / 26 / 12 | weekly |
| Cheating soft-flag rate | < 0.5 % runs | daily |
| Push CTR | ≥ 8 % | per send |
| BP premium attach | ≥ 8 % of MAU at season midpoint | weekly |

## Anti-burnout safeguards

- We **never** schedule events back-to-back. There is always a "calm week" between major
  events, with quieter daily missions.
- Daily login streak forgives 1 missed day per month automatically.
- Mission pool down-weights repeats so a player rarely sees the same mission twice in a
  week.

## Dashboards

- **Operator** (real-time): DAU, session length, crash rate, ARPDAU, top-line funnel.
- **Economy**: currency in/out by source/sink, inflation curve, BP completion rate.
- **Anti-cheat**: replay queue depth, flagged-rate, banned-rate.
- **Cohort**: retention curves by acquisition source, by region, by season.

All in Metabase on the warehouse (BigQuery), refreshed every 5 minutes.

## On-call

24/7 rotation: 1 backend engineer + 1 LiveOps designer. Pager triggers on:

- Crash-free < 99.5 % over 15 min.
- API p95 > 500 ms over 5 min.
- Anti-cheat queue > 5 000 backlog.
- Drop in DAU > 30 % vs last week same hour (after 1 hour of confirmation).
