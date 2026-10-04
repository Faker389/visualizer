"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { plans, type Interval, type PlanId } from "@/lib/billing";

export type Invoice = { id: string; date: string; description: string; amount: number; status: "paid" | "open" };

export type BillingState = {
  plan: PlanId;
  interval: Interval;
  /** Day of month each billing period starts. */
  anchorDay: number;
  /** Purchased credits; used after the plan's monthly credits and never expire. */
  bonusCredits: number;
  overagePolicy: "bill" | "pause";
  cancelAtPeriodEnd: boolean;
  card: { brand: string; last4: string; exp: string };
  invoices: Invoice[];
};

const defaultBilling: BillingState = {
  plan: "pro",
  interval: "monthly",
  anchorDay: 15,
  bonusCredits: 0,
  overagePolicy: "bill",
  cancelAtPeriodEnd: false,
  card: { brand: "Visa", last4: "4242", exp: "08/28" },
  invoices: [
    { id: "INV-1042", date: "2026-09-15", description: "Pro plan · monthly", amount: 29, status: "paid" },
    { id: "INV-1031", date: "2026-08-15", description: "Pro plan · monthly + 1,240 extra scans", amount: 32.72, status: "paid" },
    { id: "INV-1019", date: "2026-07-15", description: "Pro plan · monthly", amount: 29, status: "paid" },
    { id: "INV-1012", date: "2026-07-02", description: "Credit pack · 5 models", amount: 20, status: "paid" },
  ],
};

const STORAGE_KEY = "arcade3d.billing";

type Store = {
  billing: BillingState;
  plan: (typeof plans)[PlanId];
  update: (fn: (b: BillingState) => BillingState) => void;
  addInvoice: (description: string, amount: number) => void;
};

const BillingContext = createContext<Store | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [billing, setBilling] = useState(defaultBilling);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBilling({ ...defaultBilling, ...JSON.parse(stored) });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const update = useCallback((fn: (b: BillingState) => BillingState) => {
    setBilling((prev) => {
      const next = fn(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addInvoice = useCallback(
    (description: string, amount: number) =>
      update((b) => ({
        ...b,
        invoices: [
          { id: `INV-${1043 + b.invoices.length}`, date: new Date().toISOString().slice(0, 10), description, amount, status: "paid" },
          ...b.invoices,
        ],
      })),
    [update],
  );

  const value = useMemo(() => ({ billing, plan: plans[billing.plan], update, addInvoice }), [billing, update, addInvoice]);
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
