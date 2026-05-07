// src/middleware/auth.ts

import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../env.js';

declare module 'express-serve-static-core' {
  interface Request { playerId?: string; }
}

const secret = new TextEncoder().encode(env.jwtSecret);

export async function issueToken(playerId: string): Promise<string> {
  return await new SignJWT({ sub: playerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ code: 'unauthorized' }); return; }
  const token = header.slice('Bearer '.length);
  try {
    const { payload } = await jwtVerify(token, secret);
    req.playerId = String(payload.sub);
    next();
  } catch {
    res.status(401).json({ code: 'unauthorized' });
  }
}
