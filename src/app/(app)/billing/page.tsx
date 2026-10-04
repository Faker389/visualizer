"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Box, Check, CreditCard, Download, HardDrive, Info, Layers, Plus, ScanLine, type LucideIcon } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useBilling, type Invoice } from "@/components/billing-store";
import { useModels } from "@/components/models-store";
import { creditPacks, currentPeriod, formatMoney, formatStorage, PAY_PER_MODEL, planOrder, plans, type Interval, type Plan } from "@/lib/billing";
import { dailyScans, formatDate } from "@/lib/models";
import { cn } from "@/lib/cn";

const fmtDate = (d: Date) => formatDate(d.toISOString());
const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);

function useUsage() {
  const { billing, plan } = useBilling();
  const { models } = useModels();
  const period = currentPeriod(billing.anchorDay);

  const creditsUsed = models.filter((m) => new Date(`${m.createdAt}T00:00:00`) >= period.start).length;
  const bonusUsed = Math.max(0, creditsUsed - plan.credits);
  const scans = sum(models.map((m) => sum(dailyScans(m).slice(-period.elapsedDays))));
  const projectedScans = Math.round((scans / period.elapsedDays) * period.totalDays);
  const extraScans = Math.max(0, projectedScans - plan.scans);
  const overageCost = plan.overagePer1k !== null && billing.overagePolicy === "bill" ? (extraScans / 1000) * plan.overagePer1k : 0;

  return {
    period,
    creditsUsed,
    creditsLeft: Math.max(0, plan.credits - creditsUsed) + Math.max(0, billing.bonusCredits - bonusUsed),
    bonusLeft: Math.max(0, billing.bonusCredits - bonusUsed),
    liveModels: models.filter((m) => m.status === "active").length,
    scans,
    projectedScans,
    extraScans,
    overageCost: Math.round(overageCost * 100) / 100,
    storageMb: sum(models.map((m) => parseFloat(m.fileSize))),
  };
}

function Meter({
  icon: Icon,
  label,
  used,
  limit,
  format = (n) => n.toLocaleString("en-US"),
  projected,
  children,
}: {
  icon: LucideIcon;
  label: string;
  used: number;
  limit: number | null;
  format?: (n: number) => string;
  projected?: number;
  children?: ReactNode;
}) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const projectedPct = limit && projected ? Math.min(100, (projected / limit) * 100) : 0;
  const level = !limit ? "ok" : used >= limit ? "over" : used / limit >= 0.8 ? "warn" : "ok";
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Icon className="size-4 text-slate-400" aria-hidden /> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {format(used)} <span className="text-base font-normal text-slate-400">/ {limit === null ? "Unlimited" : format(limit)}</span>
      </p>
      {limit !== null && (
        <div
          className="relative mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`${label} used`}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
        >
          {projectedPct > pct && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-200" style={{ width: `${projectedPct}%` }} />
          )}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              level === "over" ? "bg-rose-500" : level === "warn" ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-violet-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="mt-2 text-xs text-slate-500">{children}</div>
    </Card>
  );
}

function downloadReceipt(invoice: Invoice) {
  const html = `<!doctype html><meta charset="utf-8"><title>${invoice.id}</title>
<body style="font-family:system-ui;max-width:480px;margin:40px auto;color:#0f172a">
<h1 style="font-size:20px">Arcade3D receipt</h1>
<p>${invoice.id} · ${formatDate(invoice.date)}</p>
<table style="width:100%;border-collapse:collapse;margin-top:24px">
<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${invoice.description}</td>
<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right">${formatMoney(invoice.amount)}</td></tr>
<tr><td style="padding:8px 0;font-weight:600">Total paid</td><td style="padding:8px 0;text-align:right;font-weight:600">${formatMoney(invoice.amount)}</td></tr>
</table></body>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function PlanCard({
  plan,
  interval,
  current,
  action,
  disabledReason,
  onSelect,
}: {
  plan: Plan;
  interval: Interval;
  current: boolean;
  action: string;
  disabledReason?: string;
  onSelect: () => void;
}) {
  const featured = plan.id === "pro";
  const rows = [
    `${plan.credits} new model${plan.credits === 1 ? "" : "s"} / month`,
    plan.liveModels === null ? "Unlimited live AR models" : `${plan.liveModels} live AR model${plan.liveModels === 1 ? "" : "s"}`,
    `${plan.scans.toLocaleString("en-US")} scans / month`,
    plan.overagePer1k === null ? "Viewing pauses at the scan limit" : `Then ${formatMoney(plan.overagePer1k)} per 1,000 scans`,
    `${formatStorage(plan.storageMb)} storage`,
    plan.seats === null ? "Unlimited team members" : plan.seats === 1 ? "1 user" : `${plan.seats} team members`,
    ...plan.features,
  ];
  return (
    <Card className={cn("relative flex flex-col p-6", featured && "border-indigo-300 ring-1 ring-indigo-300", current && "bg-indigo-50/40")}>
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">Most popular</span>
      )}
      <h3 className="font-semibold text-slate-900">{plan.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
      <p className="mt-4">
        <span className="text-3xl font-semibold tracking-tight">{formatMoney(plan.price[interval])}</span>
        <span className="text-sm text-slate-500"> / month</span>
      </p>
      <p className="h-5 text-xs text-slate-500">{interval === "yearly" && plan.price.yearly > 0 ? `${formatMoney(plan.price.yearly * 12)} billed yearly` : ""}</p>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-slate-700">
        {rows.map((r) => (
          <li key={r} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden /> {r}
          </li>
        ))}
      </ul>
      <Button className="mt-6 w-full" variant={featured && !current ? "primary" : "secondary"} disabled={current || !!disabledReason} onClick={onSelect}>
        {current ? "Current plan" : action}
      </Button>
      {disabledReason && <p className="mt-2 text-center text-xs text-amber-700">{disabledReason}</p>}
    </Card>
  );
}

export default function BillingPage() {
  const { billing, plan, update, addInvoice } = useBilling();
  const usage = useUsage();
  const [interval, setPlanInterval] = useState<Interval>(billing.interval);
  const [cardNote, setCardNote] = useState(false);

  const { period } = usage;
  const isPaid = plan.price.monthly > 0;
  const basePrice = billing.cancelAtPeriodEnd || billing.interval === "yearly" ? 0 : plan.price.monthly;
  const nextTotal = basePrice + usage.overageCost;

  const changePlan = (target: Plan) => {
    const rank = (id: string) => planOrder.indexOf(id as Plan["id"]);
    const upgrade = rank(target.id) > rank(plan.id);
    const price = target.price[interval];
    const message =
      target.id === "free"
        ? `Downgrade to Free at the end of this period (${fmtDate(period.end)})? Live models above the Free limit will be unpublished.`
        : `Switch to ${target.name} (${interval}) for ${formatMoney(interval === "yearly" ? price * 12 : price)} per ${interval === "yearly" ? "year" : "month"}?`;
    if (!confirm(message)) return;

    if (target.id === "free") {
      update((b) => ({ ...b, cancelAtPeriodEnd: true }));
      return;
    }
    if (upgrade) {
      const remaining = (period.totalDays - period.elapsedDays + 1) / period.totalDays;
      const prorated = Math.round(Math.max(0, target.price[interval] - plan.price[billing.interval]) * remaining * 100) / 100;
      if (prorated > 0) addInvoice(`Upgrade to ${target.name} · prorated for this period`, prorated);
    }
    update((b) => ({ ...b, plan: target.id, interval, cancelAtPeriodEnd: false, overagePolicy: target.overagePer1k === null ? "pause" : b.overagePolicy }));
  };

  const buyPack = (pack: (typeof creditPacks)[number]) => {
    if (!confirm(`Buy ${pack.credits} extra model credits for ${formatMoney(pack.price)}? Charged to ${billing.card.brand} •••• ${billing.card.last4}.`)) return;
    update((b) => ({ ...b, bonusCredits: b.bonusCredits + pack.credits }));
    addInvoice(`Credit pack · ${pack.credits} models`, pack.price);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">Your plan, usage this period, and invoices.</p>
      </div>

      {billing.cancelAtPeriodEnd && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Your {plan.name} plan ends on <span className="font-medium">{fmtDate(period.end)}</span>. After that you move to Free.
          </p>
          <Button size="sm" variant="secondary" onClick={() => update((b) => ({ ...b, cancelAtPeriodEnd: false }))}>
            Keep {plan.name}
          </Button>
        </div>
      )}

      <section aria-label="Current plan" className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Current plan</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">{plan.name}</h2>
                {isPaid && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                    {billing.interval === "yearly" ? "Yearly" : "Monthly"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {formatMoney(plan.price[billing.interval])} / month · current period {fmtDate(period.start)} – {fmtDate(period.end)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
                Change plan
              </Button>
              {isPaid && !billing.cancelAtPeriodEnd && (
                <Button variant="danger" size="sm" onClick={() => changePlan(plans.free)}>
                  Cancel plan
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-12 place-items-center rounded-lg bg-white text-xs font-bold tracking-wide text-indigo-700 ring-1 ring-slate-200">
                {billing.card.brand.toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-900">•••• {billing.card.last4}</p>
                <p className="text-slate-500">Expires {billing.card.exp}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCardNote(true)}>
              <CreditCard className="size-4" aria-hidden /> Update card
            </Button>
          </div>
          {cardNote && <p className="mt-2 text-xs text-slate-500">Card changes open the Stripe customer portal once Stripe is connected.</p>}
        </Card>

        <Card className="flex flex-col p-6">
          <p className="text-sm font-medium text-slate-500">Next invoice · {fmtDate(period.end)}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(nextTotal)}</p>
          <dl className="mt-4 flex-1 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                {billing.cancelAtPeriodEnd ? "Plan cancelled" : billing.interval === "yearly" ? `${plan.name} · prepaid yearly` : `${plan.name} · monthly`}
              </dt>
              <dd className="tabular-nums">{formatMoney(basePrice)}</dd>
            </div>
            {usage.extraScans > 0 && plan.overagePer1k !== null && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">
                  ~{usage.extraScans.toLocaleString("en-US")} extra scans{billing.overagePolicy === "pause" && " (paused)"}
                </dt>
                <dd className="tabular-nums">{formatMoney(usage.overageCost)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs text-slate-400">Estimate based on usage so far this period.</p>
        </Card>
      </section>

      <section aria-labelledby="usage-heading" className="mt-8">
        <h2 id="usage-heading" className="mb-3 font-semibold text-slate-900">
          Usage this period <span className="font-normal text-slate-500">· day {period.elapsedDays} of {period.totalDays}</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meter icon={Box} label="New models" used={usage.creditsUsed} limit={plan.credits + billing.bonusCredits}>
            {usage.creditsLeft} credit{usage.creditsLeft === 1 ? "" : "s"} left
            {usage.bonusLeft > 0 && ` (incl. ${usage.bonusLeft} purchased)`}
          </Meter>
          <Meter icon={Layers} label="Live AR models" used={usage.liveModels} limit={plan.liveModels}>
            Unpublish a model to free a slot; its files are kept.
          </Meter>
          <Meter icon={ScanLine} label="Scans" used={usage.scans} limit={plan.scans} projected={usage.projectedScans}>
            On track for ~{usage.projectedScans.toLocaleString("en-US")} by {fmtDate(period.end)}
          </Meter>
          <Meter icon={HardDrive} label="Storage" used={usage.storageMb} limit={plan.storageMb} format={formatStorage}>
            Draco compression keeps most models under 5 MB.
          </Meter>
        </div>
      </section>

      <section aria-label="Limits and add-ons" className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">When scans go over your plan</h2>
          {plan.overagePer1k === null ? (
            <p className="mt-2 text-sm text-slate-500">
              On Free, AR viewing pauses at {plan.scans.toLocaleString("en-US")} scans until the next period. Upgrade to keep models live with pay-as-you-go scans.
            </p>
          ) : (
            <div role="radiogroup" aria-label="Overage policy" className="mt-4 space-y-3">
              {(
                [
                  { value: "bill", title: "Keep models live", text: `Extra scans cost ${formatMoney(plan.overagePer1k)} per 1,000, added to the next invoice.` },
                  { value: "pause", title: "Pause viewing at the limit", text: "Visitors see a “temporarily unavailable” page. No extra charges." },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={billing.overagePolicy === o.value}
                  onClick={() => update((b) => ({ ...b, overagePolicy: o.value }))}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    billing.overagePolicy === o.value ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                      billing.overagePolicy === o.value ? "border-indigo-600" : "border-slate-300",
                    )}
                  >
                    {billing.overagePolicy === o.value && <span className="size-2 rounded-full bg-indigo-600" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{o.title}</span>
                    <span className="block text-sm text-slate-500">{o.text}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">Need more models this month?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Extra credits are used after your monthly ones and never expire.
            {plan.id === "free" && ` On Free you can also unlock a single model for ${formatMoney(PAY_PER_MODEL)}.`}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {creditPacks.map((pack) => (
              <button
                key={pack.credits}
                type="button"
                onClick={() => buyPack(pack)}
                className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span>
                  <span className="block font-medium text-slate-900">{pack.credits} models</span>
                  <span className="block text-sm text-slate-500">
                    {formatMoney(pack.price)} · {formatMoney(pack.price / pack.credits)} each
                  </span>
                </span>
                <Plus className="size-5 text-slate-400 group-hover:text-indigo-600" aria-hidden />
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section id="plans" aria-labelledby="plans-heading" className="mt-8 scroll-mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="plans-heading" className="font-semibold text-slate-900">
            Plans
          </h2>
          <div role="group" aria-label="Billing interval" className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["monthly", "yearly"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setPlanInterval(i)}
                aria-pressed={interval === i}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  interval === i ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {i === "monthly" ? "Monthly" : "Yearly"}
                {i === "yearly" && <span className={cn("ml-1.5 text-xs", interval === i ? "text-indigo-100" : "text-emerald-600")}>−17%</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 pt-3 md:grid-cols-3">
          {planOrder.map((id) => {
            const p = plans[id];
            const current = id === plan.id && (id === "free" || interval === billing.interval);
            const rank = planOrder.indexOf(id) - planOrder.indexOf(plan.id);
            const action = rank > 0 ? `Upgrade to ${p.name}` : rank < 0 ? `Downgrade to ${p.name}` : `Switch to ${interval}`;
            const disabledReason =
              id === "free"
                ? billing.cancelAtPeriodEnd
                  ? `Starts ${fmtDate(period.end)}`
                  : undefined
                : p.liveModels !== null && usage.liveModels > p.liveModels
                  ? `Unpublish ${usage.liveModels - p.liveModels} live models first`
                  : undefined;
            return (
              <PlanCard
                key={id}
                plan={p}
                interval={interval}
                current={current}
                action={action}
                disabledReason={disabledReason}
                onSelect={() => changePlan(p)}
              />
            );
          })}
        </div>
      </section>

      <section aria-label="How billing works" className="mt-4">
        <Card className="flex gap-3 p-5 text-sm text-slate-600">
          <Info className="mt-0.5 size-4 shrink-0 text-indigo-500" aria-hidden />
          <ul className="space-y-1.5">
            <li>
              <span className="font-medium text-slate-900">Scan:</span> one opening of a model’s AR link or QR code. Repeat opens from the same device within 30 minutes count once.
            </li>
            <li>
              <span className="font-medium text-slate-900">New model:</span> each capture sent for 3D generation uses one credit. Failed generations are refunded automatically.
            </li>
            <li>
              <span className="font-medium text-slate-900">Live model:</span> a model whose link and QR code currently work. Drafts don’t count.
            </li>
          </ul>
        </Card>
      </section>

      <section aria-labelledby="invoices-heading" className="mt-8">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/70 px-5 py-4">
            <h2 id="invoices-heading" className="font-semibold text-slate-900">
              Invoices
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Date</th>
                  <th scope="col" className="px-5 py-3">Description</th>
                  <th scope="col" className="px-5 py-3 text-right">Amount</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Receipt</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billing.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3">
                      <span className="text-slate-900">{inv.description}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{inv.id}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">{formatMoney(inv.amount)}</td>
                    <td className="px-5 py-3">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <Check className="size-3" strokeWidth={3} aria-hidden /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => downloadReceipt(inv)} aria-label={`Download receipt ${inv.id}`}>
                        <Download className="size-4" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </main>
  );
}
