"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { publicClient } from "@goalai/core/lib/supabase/public";
import { sessionClient } from "@goalai/core/lib/supabase/server";
import type { CouponCheck } from "@goalai/core/lib/types";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const phone = z.string().trim().transform((v) => v.replace(/\D/g, "").slice(-10)).refine((v) => /^[6-9]\d{9}$/.test(v), "Please enter a valid 10-digit mobile number.");
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const ref = z.string().trim().regex(/^[A-Za-z0-9_-]{2,30}$/).optional().nullable().catch(undefined);

/** Database errors raised by our functions are written for customers; anything else gets a generic message. */
function friendly(err: { message?: string } | null | undefined, fallback: string) {
  const m = err?.message ?? "";
  const known = /^(Please|Coupon|This order|This opening|This UPI|Your payment|You have already|Several payments|Your basket|One of the items|Only \d+|Maximum|Several orders|We already have|Too many|Choose|Could not|.+ is out of stock\.)/;
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
  payment_method: z.enum(["WHATSAPP", "COD", "UPI_ON_DELIVERY"]).default("WHATSAPP"),
  coupon: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Coupon code not found.").optional().or(z.literal("")).transform((v) => v || undefined),
  ref,
  website: z.string().optional(), // honeypot
  items: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]{1,80}$/), qty: z.number().int().min(1).max(99) })).min(1, "Your basket is empty.").max(60),
});
export type OrderInput = z.input<typeof OrderInput>;
export interface OrderPlaced { code: string; total: number; items_total: number; discount: number; delivery_fee: number; item_count: number; whatsapp: string }

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

/* ------------------------------------------------------------------ coupons */
/** Checks a coupon against the current basket value. The database prices it again when the order is placed. */
export async function checkCoupon(codeRaw: string, subtotal: number): Promise<CouponCheck> {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { ok: false, message: "Coupon code not found." };
  const sub = Math.round(Number(subtotal));
  if (!Number.isFinite(sub) || sub <= 0) return { ok: false, message: "Add something to your basket first." };
  const { data, error } = await (await sessionClient()).rpc("validate_coupon", { p_code: code, p_subtotal: sub });
  if (error) {
    console.error("[checkCoupon]", error.message);
    return { ok: false, message: friendly(error, "We couldn't check the coupon just now. Please try again.") };
  }
  const r = data as { ok: boolean; code?: string; discount?: number; message?: string } | null;
  if (r?.ok && r.code && typeof r.discount === "number") return { ok: true, code: r.code, discount: r.discount, message: r.message ?? "Coupon applied." };
  return { ok: false, message: r?.message ?? "Coupon code not found." };
}

/* ------------------------------------------------------------------ cancel an order */
/** A customer may cancel their own order while it is Received/Confirmed and unpaid. Stock returns to the shelf. */
export async function cancelOrder(code: string): Promise<ActionResult<{ code: string }>> {
  const c = String(code ?? "").trim().toUpperCase();
  if (!/^GO-\d{1,10}$/.test(c)) return { ok: false, error: "Could not find that order." };
  const { data, error } = await (await sessionClient()).rpc("cancel_my_order", { p_code: c });
  if (error) {
    console.error("[cancelOrder]", error.message);
    return { ok: false, error: friendly(error, "We couldn't cancel the order just now. Please call or WhatsApp us.") };
  }
  revalidatePath("/shop");
  return { ok: true, data: { code: (data as { code: string }).code } };
}

/* ------------------------------------------------------------------ opportunities: register (pay) and apply */
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Could not find that opening.");

/** The customer has paid by UPI and sends the reference (UTR); free openings unlock at once. The Founder verifies paid ones. */
export async function submitOppPayment(opportunityId: string, utr?: string): Promise<ActionResult<{ status: string }>> {
  const id = uuid.safeParse(opportunityId);
  if (!id.success) return { ok: false, error: id.error.issues[0]?.message ?? "Could not find that opening." };
  const { data, error } = await (await sessionClient()).rpc("submit_opp_payment", { p_opportunity: id.data, p_utr: (utr ?? "").slice(0, 60) || null });
  if (error) {
    console.error("[submitOppPayment]", error.message);
    return { ok: false, error: friendly(error, "We couldn't record your payment just now. Please try again or call us.") };
  }
  return { ok: true, data: { status: (data as { status: string }).status } };
}

const ApplicationInput = z.object({
  opportunity_id: uuid,
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone,
  email: z.string().trim().email("Please check your email address.").optional().or(z.literal("")).transform((v) => v || undefined),
  qualification: z.string().trim().min(2, "Please tell us your qualification.").max(200),
  experience: optionalText(300),
  message: optionalText(1000),
});
export type ApplicationInput = z.input<typeof ApplicationInput>;

export async function submitApplication(input: ApplicationInput): Promise<ActionResult<{ status: string }>> {
  const p = ApplicationInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the form." };
  const { data, error } = await (await sessionClient()).rpc("submit_application", { p: p.data });
  if (error) {
    console.error("[submitApplication]", error.message);
    return { ok: false, error: friendly(error, "We couldn't send your application just now. Please try again.") };
  }
  return { ok: true, data: { status: (data as { status: string }).status } };
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
  items_total: number; discount: number; coupon_code: string | null; payment_status: string; delivery_fee: number; total: number; mrp_total: number; payment_method: string;
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
