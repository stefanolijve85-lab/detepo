// src/server.ts
//
// Express 5 entry point. Wires routes, middleware, graceful shutdown.

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { env } from './env.js';
import { db } from './db/client.js';
import { redis } from './services/redis.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { runsRouter } from './routes/runs.js';
import { leaderboardsRouter } from './routes/leaderboards.js';
import { missionsRouter } from './routes/missions.js';
import { battlepassRouter } from './routes/battlepass.js';
import { storeRouter } from './routes/store.js';
import { remoteConfigRouter } from './routes/remoteConfig.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';

const app: Express = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

const v1 = express.Router();
v1.use(rateLimitMiddleware());

// Public
v1.use('/auth', authRouter);

// Authenticated
v1.use(authMiddleware);
v1.use(idempotencyMiddleware);

v1.use('/profile', profileRouter);
v1.use('/runs', runsRouter);
v1.use('/leaderboards', leaderboardsRouter);
v1.use('/missions', missionsRouter);
v1.use('/battlepass', battlepassRouter);
v1.use('/store', storeRouter);
v1.use('/remote-config', remoteConfigRouter);

app.use('/api/game/v1', v1);

// Problem-Details error handler (RFC 7807).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { status?: number; code?: string; message?: string };
  const status = e.status ?? 500;
  res.status(status).type('application/problem+json').json({
    type: `https://neonrunner.app/problems/${e.code ?? 'internal'}`,
    title: e.message ?? 'Internal error',
    status,
    code: e.code,
  });
});

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`game-backend listening on :${env.port}`);
});

const shutdown = async () => {
  server.close();
  await redis.quit();
  await db.$client.end();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
