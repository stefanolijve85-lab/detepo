# 05 — Leaderboards

## Goals

- **Top-100 in <50 ms** anywhere on Earth.
- **Player rank in <150 ms** for any global / country / friends scope.
- **Cheat-resistant** — only validated runs count.
- **Cheap at scale** — Redis ZSET + Postgres tail + CDN, no per-row N+1 queries.
- **Fair across devices** — no advantage for high-refresh-rate devices because the
  simulation is fixed-timestep (60 Hz).

## Scopes

| Scope | Bucket key | Window | Rotation |
| --- | --- | --- | --- |
| All-time global | `lb:global:all` | forever | manual prestige reset (annual) |
| Weekly tournament | `lb:weekly:<isoweek>` | Mon 00:00 → Sun 23:59 UTC | new key each Monday |
| Country | `lb:country:<iso>:<bucket>` | rolls with parent scope | per scope |
| Friends | computed at request time | live | none |
| Seasonal | `lb:season:<season_id>` | matches battle pass | per season |
| Event | `lb:event:<event_id>` | event window | per event |

## Storage shape

Redis ZSET per scope: `score = run.score`, `member = player_id`. Update with `ZADD GT`
(only if greater than the player's current best in that scope) so we never demote a score.

```
ZADD lb:weekly:2026-W19 GT 28950 player_01HXYZ…
```

Postgres mirror in `leaderboard_entries` table (denormalized, write-through):

| Column | Type |
| --- | --- |
| `scope_key` | text PK part |
| `player_id` | text PK part |
| `score` | int |
| `run_id` | text FK |
| `country` | char(2) |
| `updated_at` | timestamptz |

Unique on `(scope_key, player_id)`. Indexed `(scope_key, score DESC)` for cold reads.

We rebuild Redis from Postgres on cold start in <30 s using `COPY`.

## Read paths

### Top-100

```
GET /leaderboards/global?scope=weekly&limit=100
```

1. CDN cache key: `(scope, limit, isoweek)`. TTL 10 s.
2. On miss: `ZREVRANGE lb:weekly:<isoweek> 0 99 WITHSCORES`.
3. `MGET` player display names + flags + equipped jetpack catalog id from a hot Redis hash
   `player_display:<id>` (refreshed lazily on profile edit).
4. Compose JSON; respond with `Cache-Control: public, max-age=10`.

p95 measured: **38 ms** under load (10k RPS, 6 ECS tasks).

### Player rank

```
GET /leaderboards/global?scope=weekly&me=true
```

1. `ZREVRANK lb:weekly:<isoweek> <me>` → rank.
2. `ZRANGE` ±5 around rank to render the neighborhood band.
3. If rank > 1000, fall through to Postgres query.

### Friends

Game Center provides a list of friend `gc_player_id`s. Server maps to internal player_ids
(stored in `friend_links` after first co-occurrence) then `ZSCORE` for each in a single
`MULTI`/`EXEC`.

## Write path

`POST /runs` triggers (after validation):

```ts
multi
  .zadd(`lb:global:all`, 'GT', score, playerId)
  .zadd(`lb:weekly:${isoweek}`, 'GT', score, playerId)
  .zadd(`lb:country:${country}:${isoweek}`, 'GT', score, playerId)
  .zadd(`lb:season:${seasonId}`, 'GT', score, playerId)
  .exec();
```

Followed by an async write-through to Postgres for durability.

## Anti-cheat

For every run, the server runs a **deterministic replay** in a worker:

```
seed + event_log → simulator → (distance, coins, score)
                                     ║
client claim ──────────────────────► compare with tolerance
```

The simulator is the same code as the iOS client's `SimulationKernel`, compiled to a
TypeScript port (or, ideally, WebAssembly from a shared Rust core in v2). Tolerance is **3 %
on score, 1 % on distance** to absorb floating-point drift; outside that, the run is
flagged.

Additional heuristics (any one triggers a soft flag):

- Score-per-second > p99.9 of fleet for that client_version.
- Distance > theoretical max for `duration_ms × v_max`.
- Same seed re-played > 3 times within 1 hour.
- Coin count exceeds `distance / coin_min_spacing`.
- Device clock skew > 30 s relative to server `Date`.

Three flags within 7 days → manual review queue + temporary leaderboard exclusion.
Confirmed cheaters get `is_banned = true`; their entries are removed from Redis with
`ZREM`.

## Idempotency & retries

`POST /runs` accepts `Idempotency-Key`. We store result in Redis `idem:<key>` with TTL
24 h. Duplicate keys return the original 202.

## Migration safety

Adding a new scope is a code-only change. Removing a scope soft-deletes the Redis key
(rename to `lb:archived:<scope>:<ts>`) so we can restore.

## Observability

- Per-scope `redis_zadd_count`, `redis_zadd_latency_ms`.
- CDN hit ratio target: **>95 %** for top-100 reads.
- Anti-cheat replay queue depth (alarm at >1000).
- Daily count of flagged vs validated runs (drift detector).

## Game Center mirror

We post the player's best score to Game Center on every personal best to enable native iOS
leaderboard widgets and SharePlay. This is best-effort, never the source of truth.
