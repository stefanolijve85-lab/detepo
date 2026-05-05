import type { Product } from "@prisma/client";
import { prisma } from "../db.js";
import type {
  ProductCategory,
  ProductDTO,
  ProductMetadata,
} from "../../../shared/types.js";

export function toProductDTO(p: Product): ProductDTO {
  return {
    id: p.id,
    sku: p.sku,
    title: p.title,
    brand: p.brand,
    category: p.category as ProductCategory,
    price: Number(p.price),
    currency: p.currency,
    imageUrl: p.imageUrl,
    metadata: (p.metadata ?? {}) as ProductMetadata,
  };
}

export async function loadCandidatePool(opts: {
  budgetLimit: number;
  excludeIds?: string[];
  limit?: number;
}): Promise<ProductDTO[]> {
  const { budgetLimit, excludeIds = [], limit = 12 } = opts;
  const rows = await prisma.product.findMany({
    where: {
      price: { lte: budgetLimit },
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    take: limit,
  });
  return rows.map(toProductDTO);
}
