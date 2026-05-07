// src/services/storeKit.ts
//
// Apple StoreKit 2 JWS verification.
// In production we use Apple's @apple/app-store-server-library to fully
// verify signatures + chain. This stub decodes the payload and trusts the
// claims; do not ship it as-is.

export interface VerifiedTransaction {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchasedAt: Date;
  bundleId: string;
}

export async function verifyAppleStoreKitJWS(jws: string): Promise<VerifiedTransaction | null> {
  // jws is "header.payload.signature" base64-url
  const parts = jws.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf-8')) as {
      productId: string;
      transactionId: string;
      originalTransactionId: string;
      purchaseDate: number;
      bundleId: string;
    };
    return {
      productId: payload.productId,
      transactionId: payload.transactionId,
      originalTransactionId: payload.originalTransactionId,
      purchasedAt: new Date(payload.purchaseDate),
      bundleId: payload.bundleId,
    };
  } catch {
    return null;
  }
}
