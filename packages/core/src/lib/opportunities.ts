import { rupee } from "./pricing";

/* Opportunities: admin-made categories (Jobs, Training, …) with listings customers unlock by paying a fee. */

export interface OppCategory {
  id: string; slug: string; name: string; tagline: string; description: string; icon: string; color: string; sort: number; active: boolean;
}

export type SalaryPeriod = "MONTH" | "YEAR" | "DAY" | "HOUR" | "FIXED";
export const SALARY_PERIODS: SalaryPeriod[] = ["MONTH", "YEAR", "DAY", "HOUR", "FIXED"];
export const SALARY_PERIOD_LABEL: Record<SalaryPeriod, string> = { MONTH: "per month", YEAR: "per year", DAY: "per day", HOUR: "per hour", FIXED: "one-time" };

/** The public part of a listing. Employer, contact and interview details are NOT here — see OppPrivate. */
export interface Opportunity {
  id: string; category_id: string; title: string; teaser: string; location: string; job_type: string;
  summary: string; description: string; highlights: string[]; requirements: string;
  salary_min: number | null; salary_max: number | null; salary_period: SalaryPeriod; salary_note: string;
  training_title: string; training_details: string; training_duration: string;
  openings: number | null; apply_fee: number; fee_note: string; closes_on: string | null;
  featured: boolean; active: boolean; sort: number; created_at: string;
}

/** Only readable once the customer has an unlocked (paid) application. Enforced by row-level security. */
export interface OppPrivate { opportunity_id: string; employer: string; contact: string; address: string; instructions: string }

export const APPLICATION_STATUSES = ["PAYMENT_REVIEW", "PAYMENT_REJECTED", "PAID", "APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  PAYMENT_REVIEW: "Payment being verified", PAYMENT_REJECTED: "Payment not verified", PAID: "Unlocked — send your application",
  APPLIED: "Application sent", SHORTLISTED: "Shortlisted", SELECTED: "Selected", NOT_SELECTED: "Not selected",
};
/** Statuses in which the employer details are visible to the customer. */
export const UNLOCKED: ApplicationStatus[] = ["PAID", "APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"];

export interface MyApplication {
  id: number; status: ApplicationStatus; fee_amount: number; admin_note: string | null; created_at: string; updated_at: string;
  applied_at: string | null; opportunity_id: string; title: string; location: string; category: string; icon: string; color: string;
}

const lakh = (n: number) => rupee(n);

/** "₹18,000 – ₹25,000 per month" · "Up to ₹30,000 per month" · "Salary shared at interview". */
export function salaryLabel(o: Pick<Opportunity, "salary_min" | "salary_max" | "salary_period" | "salary_note">): string {
  const per = SALARY_PERIOD_LABEL[o.salary_period] ?? "";
  const lo = o.salary_min ?? null, hi = o.salary_max ?? null;
  let range: string;
  if (lo && hi && hi !== lo) range = `${lakh(lo)} – ${lakh(hi)}`;
  else if (lo || hi) range = hi && !lo ? `Up to ${lakh(hi)}` : lo && !hi ? `${lakh(lo)}+` : lakh((lo ?? hi) as number);
  else return o.salary_note || "Salary shared at interview";
  return `${range} ${per}`.trim() + (o.salary_note ? ` · ${o.salary_note}` : "");
}

/** Closing moment: the end of the closing day, India time. */
const endOf = (closesOn: string) => new Date(`${closesOn}T23:59:59+05:30`).getTime();

/** Whole days left until a closing date (the closing day itself counts as 1), -1 once it has passed, null when there is none. */
export function daysLeft(closesOn: string | null, now: Date = new Date()): number | null {
  if (!closesOn) return null;
  const diff = endOf(closesOn) - now.getTime();
  return diff < 0 ? -1 : Math.ceil(diff / 86_400_000);
}

export const isClosed = (o: Pick<Opportunity, "closes_on">, now: Date = new Date()) =>
  !!o.closes_on && now.getTime() > endOf(o.closes_on);

/** UPI deep link that opens GPay / PhonePe / Paytm with the payee and amount filled in. */
export function upiUri(p: { upiId: string; name: string; amount: number; note: string }): string {
  const q = new URLSearchParams({ pa: p.upiId, pn: p.name, am: String(Math.round(p.amount)), cu: "INR", tn: p.note.slice(0, 40) });
  return `upi://pay?${q.toString()}`;
}

export const isUpiId = (v: string) => /^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}$/.test(v.trim());
