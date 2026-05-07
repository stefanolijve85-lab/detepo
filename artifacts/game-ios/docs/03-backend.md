# 03 — Backend Architecture

The game backend is a small, horizontally scalable Express + Postgres + Redis service. It
lives in `artifacts/game-backend` and is deployed independently of the iOS app.

## Goals

- **<150 ms p95** for leaderboard reads worldwide (CDN + Redis ZSET + edge cache).
- **Cheat-resistant** run validation — see [Run validation](#run-validation).
- **GDPR-clean**: no PII required to play. Optional Apple Sign-In adds an `apple_sub`.
- **Multi-region read replicas** for the leaderboard (write region: `eu-west-1`).
- **Replayable**: every event is an append-only fact, enabling re-balance and re-grading.

## Tech stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Runtime | Node.js 20 LTS, Express 5 | Matches existing Detepo monorepo, low ops overhead. |
| Language | TypeScript 5.9 (strict) | Already standard in this monorepo. |
| ORM | Drizzle | Already standard. Type-safe, no codegen. |
| DB | PostgreSQL 16 | Reliable, partitionable, JSONB for event logs. |
| Cache + leaderboards | Redis 7 (ZSETs) | Native sorted-set ops are perfect for top-N queries. |
| Validation | Zod | Already in lib. |
| Auth | JWT (HS256, 30-day) + Apple Sign-In | Same JWT pattern as Detepo. |
| Push | APNs HTTP/2 with token auth | First-party, free. |
| Object storage | S3 (run replays > 30 days) | Cheap cold storage. |
| Observability | OpenTelemetry → Honeycomb | Trace request → Redis → Postgres. |

## Service map

```
                         ┌─────────────┐
                         │   CDN       │ (Fastly)  GET /leaderboard cached 10s
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │ Express API │   (12 instances, behind ALB)
                         └──┬───┬───┬──┘
                ┌───────────┘   │   └─────────┐
                ▼               ▼             ▼
        ┌───────────────┐ ┌──────────┐ ┌─────────────┐
        │  PostgreSQL   │ │  Redis   │ │   APNs      │
        │  primary +    │ │  cluster │ │   (push)    │
        │  2× replicas  │ │  3 nodes │ └─────────────┘
        └───────────────┘ └──────────┘
                │
                ▼
        ┌───────────────┐
        │  S3 cold      │ (replay logs)
        │  archives     │
        └───────────────┘
```

## API surface (v1)

All endpoints live under `/api/game/v1`. JSON in/out. Bearer JWT on all routes except
`/auth/*` and `/health`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/guest` | Issue a JWT bound to a fresh `player_id`. |
| POST | `/auth/apple` | Exchange Apple identity token → JWT (links Apple sub). |
| GET  | `/profile/me` | Return profile + inventory + missions + battle pass tier. |
| PATCH | `/profile/me` | Update display name / region / equipped cosmetics. |
| POST | `/runs` | Submit a finished run (anti-cheat validates). |
| GET  | `/leaderboards/global` | Top 100 + viewer's neighborhood. |
| GET  | `/leaderboards/country/:iso` | Country leaderboard. |
| GET  | `/leaderboards/friends` | Game Center friends, JIT joined. |
| GET  | `/leaderboards/weekly` | Weekly tournament. |
| GET  | `/missions/today` | 3 daily + 5 weekly missions for this player. |
| POST | `/missions/:id/claim` | Atomically claim mission reward. |
| GET  | `/battlepass/season/current` | Current pass + my tier + claimed flags. |
| POST | `/battlepass/claim/:tier` | Claim a tier reward. |
| POST | `/store/receipt` | Validate StoreKit 2 transaction (App Store server-to-server too). |
| GET  | `/remote-config` | Active LiveOps flags + event windows. |
| POST | `/telemetry` | Bulk client analytics events (rate-limited). |

Errors follow [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) Problem Details.

## Run submission flow

```
Client                              Server
  │                                   │
  │  POST /runs                       │
  │  ┌─────────────────────────────┐  │
  │  │ {                           │  │
  │  │   seed: "0xCAFE…",          │  │
  │  │   ts_start: 1723456789,     │  │
  │  │   ts_end:   1723456912,     │  │
  │  │   distance_cm: 145320,      │  │
  │  │   coins: 412,               │  │
  │  │   score: 28950,             │  │
  │  │   events: <CBOR base64>,    │  │
  │  │   client_version: "1.4.0",  │  │
  │  │   device: "iPhone16,1"      │  │
  │  │ }                           │  │
  │  └─────────────────────────────┘  │
  │ ─────────────────────────────────▶│
  │                                   │ 1. validate JWT → player_id
  │                                   │ 2. rate-limit (max 1 run/8s/player)
  │                                   │ 3. anti-cheat replay (worker pool)
  │                                   │ 4. write run row + event log to S3
  │                                   │ 5. ZADD leaderboard:weekly score player
  │                                   │ 6. update missions + battle pass
  │                                   │ 7. compute rewards + currency delta
  │                                   │
  │                202 Accepted       │
  │ ◀──────────────────────────────── │
  │  { run_id, score_canonical,       │
  │    rank_global, rank_country,     │
  │    rewards: [...], xp, bp_xp }    │
```

If the anti-cheat replay disagrees with the client by more than the tolerance window, the
run is **shadow-rejected**: stored, but excluded from leaderboards, and a soft cheat flag is
incremented on the player. Three flags within 7 days → manual review queue.

## Leaderboards

We use Redis ZSETs keyed as `lb:<scope>:<bucket>` where bucket is e.g. the ISO week. Top-100
queries are served from a 10-second CDN cache; the player's own rank is computed live with
`ZREVRANK`. See [05-leaderboard.md](05-leaderboard.md) for the full design including
write-through to Postgres for durability and cold reads beyond top-1000.

## Idempotency

`POST /runs` accepts an `Idempotency-Key` header (ULID generated client-side). Duplicate
keys within a 24-hour window return the original response. This protects against retries
across spotty mobile networks.

## Rate limits

| Endpoint | Limit |
| --- | --- |
| `/auth/*` | 10/min/IP |
| `/runs` | 1/8s/player + 200/day/player |
| `/leaderboards/*` | 60/min/player (CDN absorbs the rest) |
| `/telemetry` | 30 requests/min, max 100 events/req |

Implemented as a Redis token bucket via `rate-limiter-flexible`.

## Deployment

- Containerized (multi-stage Dockerfile), shipped to ECR.
- ECS Fargate, behind an ALB.
- Database migrations via `drizzle-kit` in a one-shot Fargate task gated on deploy approval.
- Blue/green deploys; old version stays warm for 10 min.

## Security

- TLS 1.3 only.
- HSTS + CSP on the few HTML responses (admin views).
- JWTs are short (30 days) and rotate on `apple` link.
- Input always validated with Zod at the route boundary.
- Output is **never** raw DB rows — explicit DTOs in `src/routes/*.ts`.
- All secrets from AWS Secrets Manager; never in env files in the repo.
