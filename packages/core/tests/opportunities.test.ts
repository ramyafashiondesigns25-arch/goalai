import { describe, expect, it } from "vitest";
import { daysLeft, isClosed, isUpiId, salaryLabel, upiUri } from "../src/lib/opportunities";

const base = { salary_min: null, salary_max: null, salary_period: "MONTH" as const, salary_note: "" };

describe("salary label", () => {
  it("shows a range with its period", () => {
    expect(salaryLabel({ ...base, salary_min: 18000, salary_max: 25000 })).toBe("₹18,000 – ₹25,000 per month");
  });
  it("shows an open-ended minimum, a cap, and a single figure", () => {
    expect(salaryLabel({ ...base, salary_min: 20000 })).toBe("₹20,000+ per month");
    expect(salaryLabel({ ...base, salary_max: 30000 })).toBe("Up to ₹30,000 per month");
    expect(salaryLabel({ ...base, salary_min: 15000, salary_max: 15000, salary_period: "DAY" })).toBe("₹15,000 per day");
  });
  it("adds the note and falls back when no salary is set", () => {
    expect(salaryLabel({ ...base, salary_min: 18000, salary_max: 25000, salary_note: "+ incentives" })).toBe("₹18,000 – ₹25,000 per month · + incentives");
    expect(salaryLabel(base)).toBe("Salary shared at interview");
    expect(salaryLabel({ ...base, salary_note: "Stipend during training" })).toBe("Stipend during training");
  });
});

describe("closing dates", () => {
  const now = new Date("2026-10-27T06:00:00Z");
  it("counts days left, inclusive of the closing day", () => {
    expect(daysLeft("2026-10-27", now)).toBe(1);
    expect(daysLeft("2026-10-30", now)).toBe(4);
    expect(daysLeft(null, now)).toBeNull();
  });
  it("is closed only after the closing day", () => {
    expect(isClosed({ closes_on: "2026-10-26" }, now)).toBe(true);
    expect(isClosed({ closes_on: "2026-10-27" }, now)).toBe(false);
    expect(isClosed({ closes_on: null }, now)).toBe(false);
  });
});

describe("UPI", () => {
  it("builds a payment link with the amount filled in", () => {
    const u = upiUri({ upiId: "goalai@okhdfcbank", name: "Goalai", amount: 500, note: "Apply CCTV Technician" });
    expect(u.startsWith("upi://pay?")).toBe(true);
    expect(u).toContain("pa=goalai%40okhdfcbank");
    expect(u).toContain("am=500");
    expect(u).toContain("cu=INR");
  });
  it("recognises valid UPI ids", () => {
    expect(isUpiId("goalai@okhdfcbank")).toBe(true);
    expect(isUpiId("9876543210@ybl")).toBe(true);
    expect(isUpiId("not an id")).toBe(false);
  });
});
