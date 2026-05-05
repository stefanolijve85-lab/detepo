// Types shared between FlowBuy backend and frontend.
// Keep this file dependency-free so it can be imported on both sides.

export type ProductCategory =
  | "APPAREL"
  | "ELECTRONICS"
  | "GROCERY"
  | "HOME"
  | "BEAUTY"
  | "OUTDOOR"
  | "OTHER";

export type InteractionAction =
  | "SWIPE_SKIP"
  | "SWIPE_BUY"
  | "BUY"
  | "ANTI_BUY_SHOWN"
  | "ALT_CHOSEN"
  | "AUTO_BOUGHT"
  | "IMPRESSION";

export interface ProductMetadata {
  pros?: string[];
  cons?: string[];
  rating?: number;        // 0-5
  tags?: string[];
  description?: string;
  // Last 6 months of prices (most recent last). Used by Anti-Buy logic.
  priceHistory?: number[];
}

export interface ProductDTO {
  id: string;
  sku: string;
  title: string;
  brand: string | null;
  category: ProductCategory;
  price: number;
  currency: string;
  imageUrl: string;
  metadata: ProductMetadata;
}

export interface WeatherSnapshot {
  city: string;
  temperatureC: number;
  conditions: string;     // "rain" | "snow" | "clear" | "clouds" | ...
  humidity: number;
  windKph: number;
}

export interface ContextSnapshot {
  city: string;
  lat: number;
  lon: number;
  localTime: string;      // ISO-8601
  weather: WeatherSnapshot;
}

// What the orchestrator returns to the API layer.
export interface Recommendation {
  primary: ProductDTO | null;
  alternatives: ProductDTO[];
  confidence: number;     // 0-100
  reasoningShort: string;
  antiBuy: {
    triggered: boolean;
    warning: string | null;
  };
  // True when confidence < threshold and the orchestrator suppressed output.
  decisionKill: boolean;
}

export interface FeedResponse extends Recommendation {
  recommendationId: string | null;
  context: ContextSnapshot;
}

export interface InteractRequest {
  userId: string;
  productId?: string;
  recommendationId?: string;
  action: InteractionAction;
  payload?: Record<string, unknown>;
}

export interface AutoBuyRequest {
  userId: string;
  recommendationId?: string;
}

export interface AutoBuyResponse {
  triggered: boolean;
  reason: string;
  productId?: string;
  amountCharged?: number;
}
