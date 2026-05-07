# 04 — Database Schema

PostgreSQL 16. Defined in Drizzle in `artifacts/game-backend/src/db/schema.ts`. Below is the
canonical reference.

## Conventions

- All tables use `id` as a 26-char ULID `text` primary key (sortable + globally unique).
- Timestamps are `timestamptz NOT NULL DEFAULT now()`.
- Soft deletion: `deleted_at timestamptz NULL`.
- `created_at` is immutable. `updated_at` is set by trigger.
- Money values are stored as `bigint` minor units (Bytes ¢).
- Region columns use ISO 3166-1 alpha-2.

## Entity overview

```
players ─┬─< inventory_items
         ├─< runs ─< run_events (S3 cold storage, but a tiny pointer row remains)
         ├─< mission_progress >── missions (template)
         ├─< battlepass_progress >── battlepass_seasons
         ├─< purchases
         ├─< friend_links
         └─< push_tokens
```

## `players`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | ULID |
| `display_name` | text | unique-folded; profanity-filtered |
| `country` | char(2) | from request `Accept-Language` / Apple region; user-editable |
| `apple_sub` | text NULL UNIQUE | filled if Apple Sign-In linked |
| `gc_player_id` | text NULL UNIQUE | Game Center scoped ID |
| `xp` | bigint NOT NULL DEFAULT 0 | total lifetime XP |
| `level` | int NOT NULL DEFAULT 1 | derived from xp; cached for sort |
| `bytes` | bigint NOT NULL DEFAULT 0 | soft currency |
| `chips` | bigint NOT NULL DEFAULT 0 | hard currency (premium) |
| `prestige` | int NOT NULL DEFAULT 0 | prestige rank |
| `streak_days` | int NOT NULL DEFAULT 0 | consecutive daily logins |
| `last_login_at` | timestamptz | for streak math |
| `cheat_flags` | int NOT NULL DEFAULT 0 | soft anti-cheat counter |
| `is_banned` | boolean NOT NULL DEFAULT false | hard ban |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | trigger-set |

Indexes:
- `idx_players_country (country)`
- `idx_players_xp_desc (xp DESC)`

## `inventory_items`

Cosmetics, jetpacks, gloves, trails, taunts. Same table because they share the same shape.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | ULID |
| `player_id` | text FK → players(id) | |
| `catalog_id` | text | e.g. `jp_quantum_v1`, `glv_neon_pulse` |
| `kind` | text | `jetpack` \| `glove` \| `trail` \| `taunt` \| `consumable` |
| `rarity` | text | `common` \| `rare` \| `epic` \| `legendary` |
| `level` | int NOT NULL DEFAULT 1 | for upgradeable jetpacks |
| `equipped` | boolean NOT NULL DEFAULT false | one per kind |
| `acquired_at` | timestamptz | |
| `source` | text | `purchase` \| `battlepass` \| `mission` \| `gift` \| `event` |

Indexes:
- `uniq_player_catalog (player_id, catalog_id)` UNIQUE — duplicates upgrade via `level++`
- `idx_inventory_player (player_id)`

## `runs`

Append-only fact table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | ULID, also used as Idempotency-Key default |
| `player_id` | text FK → players(id) | |
| `seed` | text | 64-bit RNG seed, hex |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz | |
| `duration_ms` | int | derived |
| `distance_cm` | int | |
| `coins` | int | |
| `score` | int | canonical (server-recomputed) |
| `score_client` | int | what client claimed |
| `combo_max` | int | |
| `near_misses` | int | |
| `cause_of_death` | text | `crash` \| `fall` \| `quit` \| `revive_failed` |
| `biome_path` | text[] | e.g. `{rooftop, subway, sky}` |
| `client_version` | text | |
| `device_model` | text | |
| `os_version` | text | |
| `event_log_uri` | text NULL | s3://… (after async upload) |
| `validated` | boolean NOT NULL DEFAULT false | |
| `flagged` | boolean NOT NULL DEFAULT false | |
| `created_at` | timestamptz | |

Partitioning: monthly range partition on `started_at` to keep indices tight.

Indexes:
- `idx_runs_player_started (player_id, started_at DESC)`
- `idx_runs_score_desc (score DESC) WHERE validated AND NOT flagged`

## `missions` (template)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | e.g. `mn_slide_50m_v1` |
| `cadence` | text | `daily` \| `weekly` \| `event` |
| `tier` | int | difficulty 1–5 |
| `kind` | text | `distance` \| `coins` \| `combo` \| `slide_distance` \| `near_miss` \| `jetpack_time` |
| `target` | int | numeric goal |
| `reward_bytes` | int | |
| `reward_xp` | int | |
| `reward_bp_xp` | int | |
| `reward_item_catalog_id` | text NULL | optional cosmetic |
| `active_from` | timestamptz NULL | NULL = always available |
| `active_to` | timestamptz NULL | |

## `mission_progress`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | ULID |
| `player_id` | text FK | |
| `mission_id` | text FK | |
| `assigned_at` | timestamptz | |
| `progress` | int NOT NULL DEFAULT 0 | |
| `claimed_at` | timestamptz NULL | claim flag |

Unique index: `(player_id, mission_id, assigned_at::date)` for daily resets.

## `battlepass_seasons`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | e.g. `bp_s01` |
| `name` | text | e.g. "Neon Genesis" |
| `starts_at` | timestamptz | |
| `ends_at` | timestamptz | |
| `tiers_json` | jsonb | `[{tier, free_reward, premium_reward}, …]` |
| `xp_per_tier` | int | linear; usually 1000 |

## `battlepass_progress`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `player_id` | text FK | |
| `season_id` | text FK | |
| `bp_xp` | int NOT NULL DEFAULT 0 | |
| `tier` | int NOT NULL DEFAULT 0 | derived; cached |
| `is_premium` | boolean NOT NULL DEFAULT false | bought premium pass |
| `claimed_tiers_free` | int[] NOT NULL DEFAULT '{}' | |
| `claimed_tiers_premium` | int[] NOT NULL DEFAULT '{}' | |

Unique: `(player_id, season_id)`.

## `purchases`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | ULID |
| `player_id` | text FK | |
| `product_id` | text | StoreKit identifier, e.g. `bytes_pack_lg` |
| `transaction_id` | text UNIQUE | from StoreKit 2 |
| `original_transaction_id` | text | for subs |
| `apple_signed_payload` | text | JWS, persisted for audit |
| `verified` | boolean NOT NULL DEFAULT false | |
| `purchased_at` | timestamptz | |
| `granted_bytes` | bigint NOT NULL DEFAULT 0 | |
| `granted_chips` | bigint NOT NULL DEFAULT 0 | |
| `granted_items` | text[] NOT NULL DEFAULT '{}' | |

## `friend_links`

| Column | Type | Notes |
| --- | --- | --- |
| `player_id` | text FK | |
| `friend_player_id` | text FK | |
| `source` | text | `gamecenter` \| `referral` \| `code` |
| `created_at` | timestamptz | |
| PK | `(player_id, friend_player_id)` | symmetric duplicated for fast queries |

## `push_tokens`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | ULID |
| `player_id` | text FK | |
| `platform` | text | `apns` |
| `token` | text UNIQUE | |
| `last_seen_at` | timestamptz | |
| `revoked_at` | timestamptz NULL | |

## `event_log_pointers`

The actual run event log is stored as compressed CBOR in S3. We keep a pointer row for fast
joins.

| Column | Type | Notes |
| --- | --- | --- |
| `run_id` | text PK FK → runs(id) | |
| `s3_uri` | text | |
| `bytes` | int | size, for cost telemetry |
| `crc32` | bigint | integrity |

## Migration & seed strategy

- Drizzle migrations in `artifacts/game-backend/drizzle/`.
- Catalog data (`missions`, `battlepass_seasons`, `store_products`) is seeded from JSON
  files in `artifacts/game-backend/src/db/seeds/` via a `pnpm seed:prod` script. This makes
  catalog changes a code review, not a hand-edited DB row.
