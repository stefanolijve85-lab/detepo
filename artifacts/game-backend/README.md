# game-backend

Companion backend for `artifacts/game-ios` (Neon Runner).

See `../game-ios/docs/03-backend.md` for the design overview. This README is a
quick start.

## Run locally

```sh
pnpm --filter @workspace/game-backend run dev
```

The dev server listens on `http://localhost:8787` and expects:

- `DATABASE_URL` — Postgres 16
- `REDIS_URL`    — Redis 7
- `JWT_SECRET`   — long random string
- `APPLE_TEAM_ID`, `APPLE_BUNDLE_ID` — for Apple Sign-In + StoreKit verification

## API surface

`/api/game/v1/{auth,profile,runs,leaderboards,missions,battlepass,store,remote-config,telemetry}`.

See `src/routes/` for the implementations and `src/db/schema.ts` for the
canonical database shape.

## Anti-cheat

`src/services/runValidator.ts` re-simulates the run from `seed + event_log` and
compares the canonical score with the client claim. Mismatches > tolerance ⇒
soft flag + leaderboard exclusion.
