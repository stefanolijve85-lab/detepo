# 08 — Economy Design

## Currencies

| Currency | Code | Earn | Spend | Notes |
| --- | --- | --- | --- | --- |
| **Bytes** (soft) | `BYTES` | runs, missions, daily, ads | upgrades, common cosmetics | unlimited supply |
| **Chips** (hard) | `CHIPS` | IAP, sparingly from BP, weekly tournament | premium cosmetics, BP upgrade, rare reroll | priced via IAP |
| **Tickets** | `TICKETS` | event-only | event-shop only | scarcity-based limited goods |
| **XP** | (not currency) | runs, missions | drives `level` | level only unlocks vanity |
| **BP XP** | (not currency) | runs, missions | drives BP tier | seasonal |

We deliberately use **two currencies only** in the main loop. A third hard currency is a
red flag for predatory monetization.

## Earn rates (target)

A typical 90-second skilled run on day 14:

| Source | Bytes | Chips | XP | BP XP |
| --- | --- | --- | --- | --- |
| Distance (1500 m × 0.6) | 900 | 0 | 150 | 90 |
| Coins (300 × 1.0) | 300 | 0 | 30 | 30 |
| Combo bonus | 200 | 0 | 20 | 20 |
| Near-miss bonus | 150 | 0 | 15 | 15 |
| Daily mission (1 of 3) | 500 | 0 | 100 | 50 |
| **Total** | **2 050** | **0** | **315** | **205** |

Plus once per day:
- Daily login: 250 Bytes / 1 Chip / 50 BP XP, scaling with streak.
- Watch-an-ad doubler: ×2 on next run rewards (capped at 3 / day).

A free-to-play player can buy a common cosmetic (1 500 Bytes) **on day 1** and a rare every
2–3 days. Designed.

## IAP catalog

Pricing in USD; localized via App Store auto-pricing tiers.

| SKU | Tier | Price | Contents |
| --- | --- | --- | --- |
| `chips_pack_xs` | T1 | $0.99 | 80 Chips |
| `chips_pack_sm` | T2 | $4.99 | 450 Chips (+12 %) |
| `chips_pack_md` | T5 | $9.99 | 950 Chips (+19 %) |
| `chips_pack_lg` | T10 | $19.99 | 2 100 Chips (+31 %) |
| `chips_pack_xl` | T25 | $49.99 | 5 800 Chips (+45 %) |
| `bytes_pack_sm` | T3 | $1.99 | 25 000 Bytes |
| `bytes_pack_md` | T7 | $4.99 | 80 000 Bytes |
| `battlepass_premium` | T10 | $9.99 | unlocks current season premium track |
| `battlepass_premium_plus` | T20 | $19.99 | premium + 25 tier skips |
| `vip_membership_monthly` | T5 | $4.99/mo | +50 Chips/day, ad-free, exclusive trail |
| `starter_pack_v1` | T5 | $4.99 | one-time only, 60-day window, $20 of value |
| `seasonal_legendary_jp` | T25 | $24.99 | season-exclusive Legendary jetpack |

**No randomness**: every IAP states exact contents. No loot boxes. This is required by
several jurisdictions and aligns with [Apple's App Review Guideline 3.1.5(c)](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase).

## Pricing principles

- **Headline pack at $4.99** with the highest perceived-value/$ — drives first-spend.
- **Decoy pricing**: $19.99 → $49.99 jump makes the $19.99 feel like the value pick.
- **First-time-buyer offer**: starter pack visible only first 60 days, then locked away.
- **Anchor on cosmetic, not power**: legendary jetpack > 5 % stat advantage cap; visible
  flex >>> measurable advantage.

## Sinks (where do Bytes go?)

| Sink | % of total spend (target) |
| --- | --- |
| Jetpack upgrades | 35 % |
| Common cosmetics | 30 % |
| Reroll daily missions | 10 % |
| Revives | 15 % |
| Trail upgrades | 10 % |

A healthy economy spends **~70 %** of earned Bytes within 14 days. Any drift up means too
little to spend on; drift down means inflation. Tracked in dashboards.

## Sinks (Chips)

| Sink | % |
| --- | --- |
| Premium cosmetics | 55 % |
| BP upgrade / tier skips | 25 % |
| Limited shop drops | 15 % |
| Revives (last-resort) | 5 % |

## Anti-paywalling rules

- A new player can reach the **first jetpack upgrade** in 3 sessions of 5 minutes each.
- A free player can claim **all free-track** Battle Pass tiers in <40 hours of playtime
  spread over the season (50 days).
- No content is unobtainable without paying. Premium BP reward duplicates appear in the
  *next* season's free shop after the season ends.

## Inflation guards

- Currency caps: Bytes max 9 999 999, Chips max 99 999. Prevents long-term hoard exploits.
- Dynamic pricing for upgrade ladder: `cost(level) = base * 2.2^level` with a soft cap.
- Server reconciles wallet on every reward grant. Discrepancies trigger reconciliation.

## VAT / tax / regulation

- Apple handles tax collection.
- We surface **odds tables** in-game (App Store guidelines + EU Digital Services Act).
- We surface **player spend caps** via Screen Time (parents) — no in-game cap (Apple's job).
- We follow **GDPR-K** child guardrails: behavioral ads off for users <13 (set by
  Apple's Family Sharing tag, not self-declared).
