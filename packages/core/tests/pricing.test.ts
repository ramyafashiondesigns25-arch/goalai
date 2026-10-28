import { describe, expect, it } from "vitest";
import { comparePrices, couponLabel, deliveryFor, DEFAULT_SETTINGS, offPct, rupee } from "../src/lib/pricing";
import { packSvg } from "../src/lib/pack";

describe("pricing", () => {
  it("formats rupees the Indian way", () => {
    expect(rupee(120000)).toBe("₹1,20,000");
    expect(rupee(289.4)).toBe("₹289");
  });
  it("computes the discount off MRP", () => {
    expect(offPct({ price: 289, mrp: 340 })).toBe(15);
    expect(offPct({ price: 100, mrp: 100 })).toBe(0);
  });
  it("never shows a comparison price above MRP when capped", () => {
    const rows = comparePrices({ price: 289, mrp: 340 }, DEFAULT_SETTINGS);
    expect(rows.map((r) => r.price)).toEqual([289, 332, 340]);
  });
  it("uses the raw percentages when the cap is off", () => {
    const rows = comparePrices({ price: 200, mrp: 220 }, { ...DEFAULT_SETTINGS, capMrp: false });
    expect(rows.map((r) => r.price)).toEqual([200, 230, 300]);
  });
  it("charges delivery only below the free-delivery limit", () => {
    expect(deliveryFor(300, "DELIVERY", DEFAULT_SETTINGS)).toBe(40);
    expect(deliveryFor(500, "DELIVERY", DEFAULT_SETTINGS)).toBe(0);
    expect(deliveryFor(300, "PICKUP", DEFAULT_SETTINGS)).toBe(0);
  });
});

describe("pack drawing", () => {
  it("escapes product text inside the SVG", () => {
    const svg = packSvg({ id: "x", name: "<b>Bad</b>", size: "1 kg", ta: "", tag: "A&B", color: "#123456", type: "jar" });
    expect(svg).toContain("A&amp;B");
    expect(svg).not.toContain("<b>");
  });
  it("falls back to a safe colour", () => {
    const svg = packSvg({ id: "x", name: "N", size: "1", ta: "", tag: "T", color: "red;}", type: "pouch" });
    expect(svg).toContain("#C98A4B");
  });
});

describe("coupon label", () => {
  it("describes percent coupons with a cap and a minimum", () => {
    expect(couponLabel({ kind: "PERCENT", value: 10, min_order: 300, max_discount: 100 })).toBe("10% off up to ₹100 on orders of ₹300+");
  });
  it("describes flat coupons with no minimum", () => {
    expect(couponLabel({ kind: "FLAT", value: 50, min_order: 0, max_discount: null })).toBe("₹50 off");
  });
  it("does not mention a cap that is not set", () => {
    expect(couponLabel({ kind: "PERCENT", value: 15, min_order: 0, max_discount: null })).toBe("15% off");
  });
});
