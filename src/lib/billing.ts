export type PlanId = "free" | "pro" | "business";
export type Interval = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** USD per month; the yearly price is billed as 12× this amount up front. */
  price: Record<Interval, number>;
  /** New 3D models that can be generated per billing period. */
  credits: number;
  /** Models that can be live (QR code and link working) at the same time. `null` = unlimited. */
  liveModels: number | null;
  /** Included scans per billing period. */
  scans: number;
  /** USD per 1,000 scans above the allowance. `null` = no overage; viewing pauses at the limit. */
  overagePer1k: number | null;
  storageMb: number;
  /** Team members including the owner. `null` = unlimited. */
  seats: number | null;
  features: string[];
};

export const plans: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try AR with a single product",
    price: { monthly: 0, yearly: 0 },
    credits: 1,
    liveModels: 1,
    scans: 500,
    overagePer1k: null,
    storageMb: 50,
    seats: 1,
    features: ["Extra models $4.99 each, one-time", "“Powered by Arcade3D” badge", "30-day analytics"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For shops with a growing catalog",
    price: { monthly: 29, yearly: 24 },
    credits: 10,
    liveModels: 25,
    scans: 10_000,
    overagePer1k: 3,
    storageMb: 500,
    seats: 3,
    features: ["Remove Arcade3D branding", "Custom viewer domain", "1-year analytics & CSV export"],
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "For brands running AR at scale",
    price: { monthly: 99, yearly: 82 },
    credits: 40,
    liveModels: null,
    scans: 100_000,
    overagePer1k: 2,
    storageMb: 5_000,
    seats: null,
    features: ["API & webhooks", "Priority processing", "2-year analytics retention"],
  },
};

export const planOrder: PlanId[] = ["free", "pro", "business"];

export const PAY_PER_MODEL = 4.99;

export const creditPacks = [
  { credits: 5, price: 20 },
  { credits: 20, price: 60 },
];

export const formatMoney = (usd: number) =>
  usd.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(usd) ? 0 : 2 });

export const formatStorage = (mb: number) => (mb >= 1000 ? `${+(mb / 1000).toFixed(1)} GB` : `${+mb.toFixed(1)} MB`);

/** Billing periods start on the same day of every month as the subscription's anchor date. */
export function currentPeriod(anchorDay: number, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), anchorDay);
  if (start > now) start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const day = 24 * 60 * 60 * 1000;
  const totalDays = Math.round((end.getTime() - start.getTime()) / day);
  const elapsedDays = Math.min(totalDays, Math.floor((now.getTime() - start.getTime()) / day) + 1);
  return { start, end, totalDays, elapsedDays };
}
