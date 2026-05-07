// src/env.ts

import { z } from 'zod/v4';

const schema = z.object({
  PORT: z.string().default('8787'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_BUNDLE_ID: z.string().default('com.neonrunner.app'),
  STOREKIT_SHARED_SECRET: z.string().optional(),
});

const parsed = schema.parse(process.env);

export const env = {
  port: Number(parsed.PORT),
  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  jwtSecret: parsed.JWT_SECRET,
  appleTeamId: parsed.APPLE_TEAM_ID,
  appleBundleId: parsed.APPLE_BUNDLE_ID,
  storeKitSharedSecret: parsed.STOREKIT_SHARED_SECRET,
} as const;
