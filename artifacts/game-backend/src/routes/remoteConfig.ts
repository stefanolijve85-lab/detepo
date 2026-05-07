// src/routes/remoteConfig.ts

import { Router } from 'express';
import { redis } from '../services/redis.js';

export const remoteConfigRouter: Router = Router();

const defaults = {
  startSpeed: '12.0',
  maxSpeed: '28.0',
  speedTimeConstant: '110.0',
  maxDensity: '2.4',
  biomeStageSeconds: '75.0',
  maxRevivesPerRun: '2',
  coinMultiplier: '1.0',
  xpMultiplier: '1.0',
  bpXPMultiplier: '1.0',
  eventJetpackDropId: 'jp_basic_v1',
  reviveChipCost: '50',
  audioIntensityFloor: '0.0',
};

remoteConfigRouter.get('/', async (_req, res, next) => {
  try {
    const overrides = await redis.hgetall('remote_config:active');
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ ...defaults, ...overrides });
  } catch (e) { next(e); }
});
