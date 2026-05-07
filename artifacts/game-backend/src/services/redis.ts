// src/services/redis.ts

import Redis from 'ioredis';
import { env } from '../env.js';

export const redis: Redis = new Redis(env.redisUrl, {
  enableAutoPipelining: true,
  maxRetriesPerRequest: 3,
});

export const isoWeekKey = (d = new Date()): string => {
  // ISO week number (Mon-based)
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
