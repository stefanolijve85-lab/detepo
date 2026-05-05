import { PrismaClient } from "@prisma/client";
import { MOCK_PRODUCTS } from "../src/data/mockProducts.js";

const prisma = new PrismaClient();

async function main() {
  // Demo user that the mobile app uses by default. The id is stable so the
  // frontend can hard-code it without an auth flow.
  const user = await prisma.user.upsert({
    where: { email: "demo@flowbuy.app" },
    update: {},
    create: {
      id: "demo-user",
      email: "demo@flowbuy.app",
      displayName: "Demo User",
      budgetLimit: 150,
      autoBuyEnabled: false,
      preferences: { sizes: { top: "M", bottom: "32" }, brandAffinity: ["Patagonia"] },
    },
  });
  console.log(`Seeded user: ${user.id} (${user.email})`);

  for (const p of MOCK_PRODUCTS) {
    const created = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        title: p.title,
        brand: p.brand,
        category: p.category,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        metadata: p.metadata as unknown as object,
      },
      create: {
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
    console.log(`  product: ${created.sku} - ${created.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
