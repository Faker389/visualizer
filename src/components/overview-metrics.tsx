import type { ReactNode } from "react";
import { HardDrive, Layers, ScanLine, TrendingUp, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { useBilling } from "@/components/billing-store";
import { formatStorage } from "@/lib/billing";
import type { ArModel } from "@/lib/models";

export function MetricCard({
  label,
  value,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="size-[18px]" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function OverviewMetrics({ models }: { models: ArModel[] }) {
  const { plan } = useBilling();
  const totalScans = models.reduce((s, m) => s + m.scans, 0);
  const active = models.filter((m) => m.status === "active").length;
  const drafts = models.filter((m) => m.status === "draft").length;
  const storageUsed = models.reduce((s, m) => s + parseFloat(m.fileSize), 0);
  const storageLimit = plan.storageMb;

  return (
    <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="Total Scans" value={totalScans.toLocaleString("en-US")} icon={ScanLine}>
        <p className="flex items-center gap-1.5 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
            <TrendingUp className="size-3.5" aria-hidden /> 18.2%
          </span>
          <span className="text-slate-500">vs last month</span>
        </p>
      </MetricCard>
      <MetricCard label="Live AR Models" value={String(active)} icon={Layers}>
        <p className="text-sm text-slate-500">
          {plan.liveModels === null ? "Unlimited on your plan" : `of ${plan.liveModels} on your plan`}
          {drafts > 0 && ` · ${drafts} draft${drafts === 1 ? "" : "s"} awaiting payment`}
        </p>
      </MetricCard>
      <MetricCard label="Storage Used" value={`${storageUsed.toFixed(1)} MB`} icon={HardDrive}>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Storage used"
          aria-valuemin={0}
          aria-valuemax={storageLimit}
          aria-valuenow={storageUsed}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            style={{ width: `${Math.min(100, (storageUsed / storageLimit) * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          of {formatStorage(storageLimit)} on {plan.name} plan
        </p>
      </MetricCard>
    </section>
  );
}
