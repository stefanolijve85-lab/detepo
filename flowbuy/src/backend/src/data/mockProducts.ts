import type { ProductCategory, ProductMetadata } from "../../../shared/types.js";

export interface MockProduct {
  sku: string;
  title: string;
  brand: string;
  category: ProductCategory;
  price: number;
  currency: string;
  imageUrl: string;
  metadata: ProductMetadata;
}

// Includes one deliberately overpriced item (RAIN-002) so the Anti-Buy path
// is exercisable in demos: current price 89.99 vs 6-month avg ~62.
export const MOCK_PRODUCTS: MockProduct[] = [
  {
    sku: "RAIN-001",
    title: "Compact Travel Umbrella",
    brand: "Senz",
    category: "OUTDOOR",
    price: 24.99,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1519408469771-2586093c3f14?w=800",
    metadata: {
      pros: ["Wind-proof", "Fits in any bag", "1-handed open"],
      cons: ["Single colour"],
      rating: 4.6,
      tags: ["rain", "compact", "travel"],
      description: "Aerodynamic umbrella that won't flip in a storm.",
      priceHistory: [25, 26, 24, 24, 25, 25],
    },
  },
  {
    sku: "RAIN-002",
    title: "Waterproof Trench Coat",
    brand: "Stutterheim",
    category: "APPAREL",
    price: 89.99,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800",
    metadata: {
      pros: ["Fully waterproof", "Iconic Scandinavian cut"],
      cons: ["Heavier than nylon shells"],
      rating: 4.4,
      tags: ["rain", "warm", "fashion"],
      description: "Rubberised cotton trench, warm enough for shoulder seasons.",
      // 6-month avg ~62.5 -> current 89.99 is +44%, triggers Anti-Buy.
      priceHistory: [60, 65, 60, 62, 65, 63],
    },
  },
  {
    sku: "WARM-001",
    title: "Merino Wool Beanie",
    brand: "Patagonia",
    category: "APPAREL",
    price: 32.0,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800",
    metadata: {
      pros: ["Itch-free merino", "Reinforced cuff"],
      cons: ["Dry-clean recommended"],
      rating: 4.7,
      tags: ["warm", "winter", "merino"],
      description: "Soft merino beanie for sub-10C mornings.",
      priceHistory: [30, 32, 30, 31, 32, 32],
    },
  },
  {
    sku: "COOL-001",
    title: "Insulated Water Bottle 750ml",
    brand: "Klean Kanteen",
    category: "OUTDOOR",
    price: 28.5,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
    metadata: {
      pros: ["Cold for 24h", "Leak-proof"],
      cons: ["Hand wash only"],
      rating: 4.5,
      tags: ["cooling", "hot-weather", "hydration"],
      description: "Vacuum-insulated bottle for hot summer days.",
      priceHistory: [27, 28, 28, 28, 29, 29],
    },
  },
  {
    sku: "ELEC-001",
    title: "Wireless Noise-Cancelling Earbuds",
    brand: "Sony",
    category: "ELECTRONICS",
    price: 129.0,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800",
    metadata: {
      pros: ["Best-in-class ANC", "8h battery"],
      cons: ["Bulky case"],
      rating: 4.8,
      tags: ["audio", "commute"],
      description: "Top-rated ANC earbuds for daily commutes.",
      priceHistory: [120, 125, 130, 128, 129, 129],
    },
  },
  {
    sku: "HOME-001",
    title: "Linen Throw Blanket",
    brand: "HAY",
    category: "HOME",
    price: 59.0,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
    metadata: {
      pros: ["Softens with each wash", "OEKO-TEX certified"],
      cons: ["Wrinkles easily"],
      rating: 4.3,
      tags: ["warm", "home", "cozy"],
      description: "Stonewashed linen throw, perfect for chilly evenings indoors.",
      priceHistory: [55, 58, 60, 60, 59, 59],
    },
  },
  {
    sku: "BEAU-001",
    title: "SPF 50 Mineral Sunscreen",
    brand: "La Roche-Posay",
    category: "BEAUTY",
    price: 18.5,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800",
    metadata: {
      pros: ["Reef-safe", "No white cast"],
      cons: ["Slightly thick"],
      rating: 4.6,
      tags: ["cooling", "hot-weather", "skincare"],
      description: "Daily mineral sunscreen for clear, sunny days.",
      priceHistory: [18, 18, 19, 18, 18, 18],
    },
  },
  {
    sku: "GROC-001",
    title: "Single-Origin Coffee Beans 250g",
    brand: "Lot Sixty One",
    category: "GROCERY",
    price: 14.0,
    currency: "EUR",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800",
    metadata: {
      pros: ["Roasted weekly", "Direct trade"],
      cons: ["Fast oxidation once opened"],
      rating: 4.7,
      tags: ["coffee", "warm", "morning"],
      description: "Small-batch Ethiopian beans, bright and floral.",
      priceHistory: [14, 14, 14, 14, 14, 14],
    },
  },
];
