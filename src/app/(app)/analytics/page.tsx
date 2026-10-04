"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Download, Globe, MousePointerClick, Smartphone, Timer, TrendingDown, TrendingUp, Trophy, Users } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { OverviewMetrics } from "@/components/overview-metrics";
import { ScanChart } from "@/components/scan-chart";
import { useModels } from "@/components/models-store";
import { useSettings } from "@/components/settings-store";
import { countrySplit, dailyScans, deviceSplit, isLive, scanHourProfile, type ArModel } from "@/lib/models";
import { cn } from "@/lib/cn";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const pctChange = (current: number, previous: number) => (previous ? ((current - previous) / previous) * 100 : null);

type Row = { model: ArModel; daily: number[]; scans: number; arOpens: number; clicks: number; previous: number; change: number | null };

/** Share of unique devices among scans; repeat visits within 30 minutes are already merged into one scan. */
const UNIQUE_VISITOR_RATE = 0.82;

const pctOf = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "—");

function Funnel({ steps }: { steps: { label: string; value: number; hint: string }[] }) {
  const max = Math.max(1, steps[0].value);
  return (
    <ol className="mt-5 space-y-4">
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{s.label}</span>
            <span className="tabular-nums text-slate-900">
              {s.value.toLocaleString("en-US")}
              {i > 0 && <span className="ml-1.5 text-xs text-slate-400">{pctOf(s.value, steps[i - 1].value)} of previous step</span>}
            </span>
          </div>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${Math.max(1, (s.value / max) * 100)}%`, opacity: 1 - i * 0.2 }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{s.hint}</p>
        </li>
      ))}
    </ol>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm text-slate-400">—</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{up ? "up" : "down"}</span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function CardHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: typeof Globe }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="size-[18px]" aria-hidden />
      </div>
      <div>
        <h2 className="font-medium text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ShareList({ items, total }: { items: { label: string; share: number }[]; total: number }) {
  return (
    <ul className="mt-5 space-y-4">
      {items.map(({ label, share }) => (
        <li key={label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700">{label}</span>
            <span className="tabular-nums text-slate-500">
              {Math.round(share * total).toLocaleString("en-US")} <span className="text-slate-400">· {(share * 100).toFixed(0)}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${share * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function HourChart({ total }: { total: number }) {
  const weight = sum(scanHourProfile);
  const counts = scanHourProfile.map((v) => Math.round((v / weight) * total));
  const max = Math.max(1, ...counts);
  const peak = counts.indexOf(Math.max(...counts));
  const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <>
      <p className="mt-4 text-sm text-slate-500">
        Peak at <span className="font-medium text-slate-900">{hour(peak)}–{hour((peak + 1) % 24)}</span>
      </p>
      <div className="mt-3 flex h-32 items-end gap-1" role="img" aria-label={`Scans by hour of day, peak at ${hour(peak)}`}>
        {counts.map((c, h) => (
          <div
            key={h}
            title={`${hour(h)} · ${c.toLocaleString("en-US")} scans`}
            className={cn("flex-1 rounded-t transition-colors", h === peak ? "bg-indigo-600" : "bg-indigo-200 hover:bg-indigo-400")}
            style={{ height: `${Math.max(2, (c / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </>
  );
}

function exportCsv(rows: Row[], range: Range) {
  const header = ["Model", "Status", `Scans (${range}d)`, "Change %", "AR opens", "Shop clicks", "File size", "Polygons", "Viewer slug"];
  const lines = rows.map(({ model, scans, arOpens, clicks, change }) => [
    model.name,
    model.status,
    scans,
    change === null ? "" : change.toFixed(1),
    arOpens,
    clicks,
    model.fileSize,
    model.polygons,
    model.slug,
  ]);
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ar-analytics-${range}d.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { models } = useModels();
  const heavyMb = useSettings().settings.maxFileSizeMb;
  const [range, setRange] = useState<Range>(30);

  const rows = useMemo<Row[]>(
    () =>
      models
        .map((model) => {
          const history = dailyScans(model);
          const daily = history.slice(-range);
          const scans = sum(daily);
          const previous = sum(history.slice(-2 * range, -range));
          const ratio = (n: number) => (model.scans ? Math.round((scans * n) / model.scans) : 0);
          return { model, daily, scans, arOpens: ratio(model.arOpens), clicks: ratio(model.shopClicks), previous, change: pctChange(scans, previous) };
        })
        .sort((a, b) => b.scans - a.scans),
    [models, range],
  );

  const daily = Array.from({ length: range }, (_, i) => sum(rows.map((r) => r.daily[i])));
  const total = sum(daily);
  const change = pctChange(total, sum(rows.map((r) => r.previous)));
  const top = rows.find((r) => r.scans > 0);
  const heavy = models.filter((m) => parseFloat(m.fileSize) > heavyMb);
  const arOpens = sum(rows.map((r) => r.arOpens));
  const clicks = sum(rows.map((r) => r.clicks));
  const visitors = Math.round(total * UNIQUE_VISITOR_RATE);
  const avgSession = total ? Math.round(sum(rows.map((r) => r.model.avgSessionSec * r.scans)) / total) : 0;
  const noCta = models.filter((m) => isLive(m) && !m.ctaUrl);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">How people find and open your AR models: scans, devices, locations and timing.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Date range" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  range === r ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {r}d
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => exportCsv(rows, range)} disabled={!rows.length}>
            <Download className="size-4" aria-hidden /> Export CSV
          </Button>
        </div>
      </div>

      <OverviewMetrics models={models} />

      <section aria-label="Scan activity" className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Scans · last {range} days</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{total.toLocaleString("en-US")}</p>
                <Delta value={change} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                vs previous {range} days · {Math.round(total / range).toLocaleString("en-US")} per day on average
              </p>
            </div>
            {top && (
              <Link
                href={`/models/${top.model.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                <Trophy className="size-4 text-amber-500" aria-hidden />
                <div className="text-sm">
                  <p className="text-xs text-slate-500">Top model</p>
                  <p className="font-medium text-slate-900">{top.model.name}</p>
                </div>
              </Link>
            )}
          </div>
          <div className="mt-6">
            <ScanChart data={daily} />
          </div>
        </Card>

        <Card className="p-5">
          <CardHeader title="Devices" subtitle="Where AR opens: Quick Look vs Scene Viewer" icon={Smartphone} />
          <ShareList items={deviceSplit} total={total} />
        </Card>
      </section>

      <section aria-label="Conversion" className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader title="From scan to shop" subtitle={`What visitors did after opening a model in the last ${range} days`} icon={MousePointerClick} />
          <Funnel
            steps={[
              { label: "Scans", value: total, hint: "Opened the viewer from a QR code, link or embed." },
              { label: "Opened in AR", value: arOpens, hint: "Placed the model in their room with Quick Look, Scene Viewer or WebXR." },
              { label: "Clicked buy button", value: clicks, hint: "Went to your product page from the viewer." },
            ]}
          />
          {noCta.length > 0 && (
            <p className="mt-4 rounded-xl bg-indigo-50/70 px-3.5 py-2.5 text-sm text-indigo-900">
              {noCta.length} live model{noCta.length === 1 ? " has" : "s have"} no buy button ({noCta.map((m) => m.name).join(", ")}).{" "}
              <Link href={`/models/${noCta[0].id}`} className="font-medium underline underline-offset-2">
                Add one
              </Link>{" "}
              to see which models drive sales.
            </p>
          )}
        </Card>
        <div className="grid gap-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Users className="size-4 text-slate-400" aria-hidden /> Unique visitors
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{visitors.toLocaleString("en-US")}</p>
            <p className="mt-1 text-xs text-slate-500">{(total / Math.max(1, visitors)).toFixed(2)} scans per visitor</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Timer className="size-4 text-slate-400" aria-hidden /> Avg. time in viewer
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{avgSession ? `${avgSession}s` : "—"}</p>
            <p className="mt-1 text-xs text-slate-500">Longer visits usually mean more AR placements.</p>
          </Card>
        </div>
      </section>

      <section aria-label="Audience" className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader title="Top countries" subtitle={`Share of scans in the last ${range} days`} icon={Globe} />
          <ShareList
            items={[...countrySplit, { label: "Other", share: 1 - sum(countrySplit.map((c) => c.share)) }]}
            total={total}
          />
        </Card>
        <Card className="p-5">
          <CardHeader title="Peak scan times" subtitle="When to run campaigns and in-store displays" icon={Clock} />
          <HourChart total={total} />
        </Card>
      </section>

      {heavy.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">
              {heavy.length} model{heavy.length === 1 ? " is" : "s are"} over {heavyMb} MB
            </span>{" "}
            ({heavy.map((m) => m.name).join(", ")}). Large files load slowly on mobile data and lose viewers before AR opens.
          </p>
        </div>
      )}

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-slate-200/70 px-5 py-4">
          <h2 className="font-medium text-slate-900">Model performance</h2>
          <p className="text-sm text-slate-500">Scans per model in the last {range} days, compared with the period before.</p>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Model</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-right">Scans</th>
                  <th scope="col" className="px-5 py-3">Change</th>
                  <th scope="col" className="hidden px-5 py-3 md:table-cell">Share</th>
                  <th scope="col" className="px-5 py-3 text-right">Size</th>
                  <th scope="col" className="hidden px-5 py-3 text-right sm:table-cell">AR opens</th>
                  <th scope="col" className="hidden px-5 py-3 text-right sm:table-cell">Shop clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ model, scans, arOpens, clicks, change }) => {
                  const share = total ? scans / total : 0;
                  const isHeavy = parseFloat(model.fileSize) > heavyMb;
                  return (
                    <tr key={model.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <Link href={`/models/${model.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                          {model.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge status={model.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">{scans.toLocaleString("en-US")}</td>
                      <td className="px-5 py-3">{model.status === "active" ? <Delta value={change} /> : <span className="text-slate-400">—</span>}</td>
                      <td className="hidden px-5 py-3 md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${share * 100}%` }} />
                          </div>
                          <span className="tabular-nums text-slate-500">{(share * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className={cn("px-5 py-3 text-right tabular-nums", isHeavy ? "font-medium text-amber-700" : "text-slate-600")}>
                        {model.fileSize}
                      </td>
                      <td className="hidden px-5 py-3 text-right tabular-nums text-slate-600 sm:table-cell">
                        {arOpens.toLocaleString("en-US")} <span className="text-xs text-slate-400">{pctOf(arOpens, scans)}</span>
                      </td>
                      <td className="hidden px-5 py-3 text-right tabular-nums text-slate-600 sm:table-cell">
                        {model.ctaUrl || clicks ? (
                          <>
                            {clicks.toLocaleString("en-US")} <span className="text-xs text-slate-400">{pctOf(clicks, scans)}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">No button</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-slate-500">No models yet. Analytics appear once your first model gets scanned.</p>
        )}
      </Card>
    </main>
  );
}
