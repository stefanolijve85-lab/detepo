// src/middleware/idempotency.ts
//
// Stores and replays POST responses keyed by Idempotency-Key header.

import type { RequestHandler, Request, Response } from 'express';
import { redis } from '../services/redis.js';

export function idempotencyMiddleware(): RequestHandler {
  return async (req: Request, res: Response, next): Promise<void> => {
    if (req.method !== 'POST') { next(); return; }
    const key = req.header('idempotency-key');
    if (!key) { next(); return; }
    const cached = await redis.get(`idem:${req.playerId}:${key}`);
    if (cached) {
      res.status(202).type('application/json').send(cached);
      return;
    }
    const originalJson = res.json.bind(res);
    (res as Response).json = ((body: unknown) => {
      const str = JSON.stringify(body);
      void redis.set(`idem:${req.playerId}:${key}`, str, 'EX', 86_400);
      return originalJson(body);
    }) as Response['json'];
    next();
  };
}
