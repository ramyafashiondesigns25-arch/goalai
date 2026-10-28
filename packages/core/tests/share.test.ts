import { describe, expect, it } from "vitest";
import { productShareText, shareLinks, whatsappLink, whatsappPayMessage } from "../src/lib/share";
import { inShelf, mainCats, subsOf, catName } from "../src/lib/catalog";

describe("share links", () => {
  const l = shareLinks({ url: "https://goalai.in/product/cashew?a=1&b=2", title: "Cashew", text: "Cashew 250g — ₹285" });
  it("builds a WhatsApp link with the text and the url", () => {
    expect(l.whatsapp.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(l.whatsapp)).toContain("https://goalai.in/product/cashew?a=1&b=2");
  });
  it("encodes the url so query strings survive", () => {
    expect(l.facebook).toContain(encodeURIComponent("https://goalai.in/product/cashew?a=1&b=2"));
    expect(l.telegram).toContain("t.me/share/url");
    expect(l.x).toContain("twitter.com/intent/tweet");
    expect(l.email.startsWith("mailto:?subject=")).toBe(true);
  });
  it("describes the product with its price and MRP", () => {
    expect(productShareText({ name: "Cashew", size: "250g", price: 285, mrp: 330 })).toBe("Cashew 250g — ₹285 (MRP ₹330) · organic, from Goalai");
    expect(productShareText({ name: "Rice", size: "5kg", price: 300, mrp: 300 })).toBe("Rice 5kg — ₹300 · organic, from Goalai");
  });
});

describe("WhatsApp payment", () => {
  it("writes the order, items and total into the message", () => {
    const m = whatsappPayMessage({ code: "GO-1001", total: 640, discount: 50, delivery_fee: 0, fulfilment: "DELIVERY", name: "Ravi",
      items: [{ name: "Almond", size: "250g", qty: 2, line: 600 }, { name: "Ragi laddu", size: "6 pcs", qty: 1, line: 90 }] });
    expect(m).toContain("order GO-1001 (Ravi)");
    expect(m).toContain("• Almond 250g × 2 — ₹600");
    expect(m).toContain("Coupon discount: −₹50");
    expect(m).toContain("Delivery: Free");
    expect(m).toContain("Total: ₹640");
  });
  it("says pick up for pickup orders and builds a clean wa.me link", () => {
    expect(whatsappPayMessage({ code: "GO-2", total: 100, fulfilment: "PICKUP", items: [] })).toContain("Pick up at shop");
    expect(whatsappLink("+91 63801 50117", "hi there")).toBe("https://wa.me/916380150117?text=hi%20there");
  });
});

describe("category tree", () => {
  const cats = [
    { id: "nuts", name: "Nuts", ta: "", color: "#000000", parent_id: null, sort: 10 },
    { id: "homemade", name: "Home-made", ta: "", color: "#000000", parent_id: null, sort: 5 },
    { id: "pista", name: "Pista", ta: "", color: "#000000", parent_id: "nuts", sort: 20 },
    { id: "badam", name: "Badam", ta: "", color: "#000000", parent_id: "nuts", sort: 10 },
  ];
  it("lists main categories and their sub-categories in order", () => {
    expect(mainCats(cats).map((c) => c.id)).toEqual(["homemade", "nuts"]);
    expect(subsOf(cats, "nuts").map((c) => c.id)).toEqual(["badam", "pista"]);
    expect(subsOf(cats, "homemade")).toEqual([]);
  });
  it("filters products by main category and sub-category", () => {
    const p = { cat: "nuts", sub: "badam" };
    expect(inShelf(p, "all", null)).toBe(true);
    expect(inShelf(p, "nuts", null)).toBe(true);
    expect(inShelf(p, "nuts", "badam")).toBe(true);
    expect(inShelf(p, "nuts", "pista")).toBe(false);
    expect(inShelf(p, "homemade", null)).toBe(false);
  });
  it("names categories from the live list, falling back to the id", () => {
    expect(catName("pista", cats)).toBe("Pista");
    expect(catName("zzz", cats)).toBe("zzz");
    expect(catName(null, cats)).toBe("");
  });
});
