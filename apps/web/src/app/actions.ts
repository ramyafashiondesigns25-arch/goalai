"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { publicClient } from "@goalai/core/lib/supabase/public";
import { sessionClient } from "@goalai/core/lib/supabase/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const phone = z.string().trim().transform((v) => v.replace(/\D/g, "").slice(-10)).refine((v) => /^[6-9]\d{9}$/.test(v), "Please enter a valid 10-digit mobile number.");
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const ref = z.string().trim().regex(/^[A-Za-z0-9_-]{2,30}$/).optional().nullable().catch(undefined);

/** Database errors raised by our functions are written for customers; anything else gets a generic message. */
function friendly(err: { message?: string } | null | undefined, fallback: string) {
  const m = err?.message ?? "";
  const known = /^(Please|Your basket|One of the items|Only \d+|Maximum|Several orders|We already have|Too many|Choose|Could not|.+ is out of stock\.)/;
  return known.test(m) ? m : fallback;
}

/* ------------------------------------------------------------------ orders */
const OrderInput = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone,
  email: z.string().trim().email("Please check your email address.").optional().or(z.literal("")).transform((v) => v || undefined),
  fulfilment: z.enum(["PICKUP", "DELIVERY"]),
  address: optionalText(400),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Please check the PIN code.").optional().or(z.literal("")).transform((v) => v || undefined),
  notes: optionalText(500),
  payment_method: z.enum(["COD", "UPI_ON_DELIVERY"]).default("COD"),
  ref,
  website: z.string().optional(), // honeypot
  items: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]{1,80}$/), qty: z.number().int().min(1).max(99) })).min(1, "Your basket is empty.").max(60),
});
export type OrderInput = z.input<typeof OrderInput>;
export interface OrderPlaced { code: string; total: number; items_total: number; delivery_fee: number; item_count: number; whatsapp: string }

export async function placeOrder(input: OrderInput): Promise<ActionResult<OrderPlaced>> {
  const parsed = OrderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const v = parsed.data;
  if (v.fulfilment === "DELIVERY" && (!v.address || v.address.length < 8)) return { ok: false, error: "Please enter your full delivery address." };
  const { data, error } = await (await sessionClient()).rpc("place_order", { p: v });
  if (error) {
    console.error("[placeOrder]", error.message);
    return { ok: false, error: friendly(error, "We couldn't place the order just now. Please try again or call us.") };
  }
  // stock changed: refresh the affected pages in the background
  revalidatePath("/shop");
  v.items.forEach((i) => revalidatePath(`/product/${i.id}`));
  return { ok: true, data: data as OrderPlaced };
}

/* ------------------------------------------------------------------ enquiries */
const EnquiryInput = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone,
  email: z.string().trim().email("Please check your email address.").optional().or(z.literal("")).transform((v) => v || undefined),
  city: optionalText(80),
  message: optionalText(1000),
  category_id: z.string().uuid("Please choose a service."),
  project_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
  ref,
  website: z.string().optional(),
});
export type EnquiryInput = z.input<typeof EnquiryInput>;

export async function submitEnquiry(input: EnquiryInput): Promise<ActionResult<{ lead_code: string; service: string }>> {
  const parsed = EnquiryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { data, error } = await (await sessionClient()).rpc("submit_enquiry", { p: parsed.data });
  if (error) {
    console.error("[submitEnquiry]", error.message);
    return { ok: false, error: friendly(error, "We couldn't send your enquiry just now. Please call or WhatsApp us.") };
  }
  return { ok: true, data: data as { lead_code: string; service: string } };
}

/* ------------------------------------------------------------------ tracking */
export interface TrackedOrder {
  code: string; status: string; fulfilment: string; created_at: string; updated_at: string; name: string;
  items_total: number; delivery_fee: number; total: number; mrp_total: number; payment_method: string;
  items: { name: string; size: string; price: number; qty: number; line: number }[];
}

export async function trackOrder(code: string, phoneRaw: string): Promise<ActionResult<TrackedOrder>> {
  const c = String(code ?? "").trim().toUpperCase();
  const ph = String(phoneRaw ?? "").replace(/\D/g, "").slice(-10);
  if (!/^GO-\d{1,10}$/.test(c)) return { ok: false, error: "Order numbers look like GO-1001." };
  if (!/^[6-9]\d{9}$/.test(ph)) return { ok: false, error: "Enter the mobile number used for the order." };
  const { data, error } = await publicClient().rpc("track_order", { p_code: c, p_phone: ph });
  if (error) return { ok: false, error: "Couldn't look up the order just now. Please try again." };
  if (!data) return { ok: false, error: "No order found with that number and mobile." };
  return { ok: true, data: data as TrackedOrder };
}
