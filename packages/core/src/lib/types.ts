export type PackType = "pouch" | "bag" | "bottle" | "jar" | "box" | "tube" | "bar";

export interface Product {
  id: string;
  cat: string;
  name: string;
  ta: string;
  size: string;
  price: number;
  mrp: number;
  stock: number | null;
  desc: string;
  details: [string, string][];
  cert: string;
  isNew: boolean;
  img: string | null;
  imgPath: string | null;
  type: PackType;
  tag: string;
  color: string;
  sort: number;
  active: boolean;
}

export interface StoreSettings {
  onlinePct: number;
  retailPct: number;
  capMrp: boolean;
  freeAbove: number;
  deliveryFee: number;
  whatsapp: string;
}

export interface ServiceProject {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  starting_price: number | null;
  price_per_unit: number | null;
  area_unit: string | null;
  unit_label: string | null;
  unit_size: string | null;
  available_units: number | null;
  total_units: number | null;
  approval: string | null;
  amenities: string[] | null;
  cover_image: string | null;
  gallery: string[] | null;
  map_url: string | null;
}

export interface Service {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  is_property: boolean;
  projects: ServiceProject[];
}

export interface ProductRow {
  id: string; cat: string; name: string; ta: string; size: string; price: number; mrp: number;
  stock: number | null; description: string; details: unknown; cert: string; is_new: boolean;
  image_url: string | null; image_path: string | null; pack_type: string; tag: string; color: string;
  sort: number; active: boolean;
}

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Received",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/* ---------- payments ---------- */
export const PAYMENT_METHOD_LABEL: Record<string, string> = { COD: "Cash on delivery", UPI_ON_DELIVERY: "UPI on delivery", ONLINE: "Paid online" };
export const PAID_VIA_LABEL: Record<string, string> = { CASH: "Cash", UPI: "UPI" };

/* ---------- service work ---------- */
export const WORK_STAGES = ["RECEIVED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export type WorkStage = (typeof WORK_STAGES)[number];
export const WORK_STAGE_LABEL: Record<WorkStage, string> = {
  RECEIVED: "Received", IN_PROGRESS: "In progress", ON_HOLD: "On hold", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
export interface WorkUpdate { id?: number; stage: WorkStage; progress: number; note: string; internal?: boolean; author?: string | null; by?: string | null; created_at: string }
