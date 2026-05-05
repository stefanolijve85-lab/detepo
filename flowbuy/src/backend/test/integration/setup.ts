import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db.js";
import { MOCK_PRODUCTS } from "../../src/data/mockProducts.js";

/**
 * Boots an in-process Express server on a random port and returns helpers
 * for hitting it. Tests opt in by importing this; if TEST_DATABASE_URL (or
 * DATABASE_URL) is missing, callers can use `shouldSkip()` to gracefully
 * skip the suite instead of failing.
 */

export function shouldSkip(): { skip: true; reason: string } | { skip: false } {
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    return {
      skip: true,
      reason:
        "Integration tests require DATABASE_URL or TEST_DATABASE_URL — skipping.",
    };
  }
  return { skip: false };
}

export interface TestServer {
  baseUrl: string;
  http: <T>(path: string, init?: RequestInit) => Promise<T>;
  rawFetch: (path: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestServer> {
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    rawFetch: (path, init) => fetch(baseUrl + path, init),
    http: async <T>(path: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(baseUrl + path, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      return (await res.json()) as T;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/**
 * Wipes every table the API touches and reseeds the demo user + products.
 * Cheaper than running `prisma migrate reset` between tests; keeps the
 * schema across test files.
 */
export async function resetDb(): Promise<{ userId: string }> {
  // Use raw SQL for TRUNCATE … RESTART IDENTITY CASCADE — Prisma's
  // deleteMany doesn't free the auto-increment seqs nor cascade reliably.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Recommendation", "Interaction", "UserContext", "Product", "User" RESTART IDENTITY CASCADE`,
  );

  const user = await prisma.user.create({
    data: {
      id: "demo-user",
      email: "demo@flowbuy.app",
      displayName: "Demo User",
      budgetLimit: 150,
      autoBuyEnabled: false,
      preferences: { sizes: { top: "M" }, brandAffinity: ["Patagonia"] },
    },
  });

  for (const p of MOCK_PRODUCTS) {
    await prisma.product.create({
      data: {
        sku: p.sku,
        title: p.title,
        brand: p.brand,
        category: p.category,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        metadata: p.metadata as unknown as object,
      },
    });
  }
  return { userId: user.id };
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
