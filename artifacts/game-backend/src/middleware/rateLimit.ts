// src/middleware/rateLimit.ts
//
// Token-bucket rate limit backed by Redis. Per-route policies are defined here;
// the middleware looks up a policy by `req.path`.

import type { RequestHandler } from 'express';
import { redis } from '../services/redis.js';

type Policy = { limit: number; windowSec: number; key: (req: { ip?: string; playerId?: string }) => string };

const policies: Array<{ match: RegExp; policy: Policy }> = [
  { match: /^\/auth\//, policy: { limit: 10, windowSec: 60, key: (r) => `rl:auth:${r.ip}` } },
  { match: /^\/runs/, policy: { limit: 200, windowSec: 86_400, key: (r) => `rl:runs:${r.playerId ?? r.ip}` } },
  { match: /^\/leaderboards/, policy: { limit: 60, windowSec: 60, key: (r) => `rl:lb:${r.playerId ?? r.ip}` } },
  { match: /.*/, policy: { limit: 600, windowSec: 60, key: (r) => `rl:any:${r.playerId ?? r.ip}` } },
];

export function rateLimitMiddleware(): RequestHandler {
  return async (req, res, next) => {
    const policy = policies.find((p) => p.match.test(req.path))!.policy;
    const k = policy.key({ ip: req.ip, playerId: req.playerId });
    const tx = redis.multi();
    tx.incr(k);
    tx.expire(k, policy.windowSec, 'NX');
    const [count] = (await tx.exec()) ?? [];
    const n = Number(count?.[1] ?? 0);
    res.setHeader('X-RateLimit-Limit', String(policy.limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, policy.limit - n)));
    if (n > policy.limit) { res.status(429).json({ code: 'rate_limited' }); return; }
    next();
  };
}
