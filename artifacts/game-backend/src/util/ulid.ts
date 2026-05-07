// src/util/ulid.ts

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Generate a 26-character ULID (Crockford base32, monotonic timestamp). */
export function ulid(): string {
  let ts = Date.now();
  let tsPart = '';
  for (let i = 0; i < 10; i++) {
    tsPart = ALPHABET[ts % 32]! + tsPart;
    ts = Math.floor(ts / 32);
  }
  let randPart = '';
  const rnd = new Uint8Array(16);
  // Node 18+ has globalThis.crypto
  globalThis.crypto.getRandomValues(rnd);
  for (let i = 0; i < 16; i++) randPart += ALPHABET[rnd[i]! % 32]!;
  return tsPart + randPart;
}
