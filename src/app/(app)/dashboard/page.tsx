"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Box, Download, EllipsisVertical, LoaderCircle, Pencil, Plus, QrCode, RefreshCw, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { NotificationsMenu } from "@/components/notifications-menu";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { OverviewMetrics } from "@/components/overview-metrics";
import { UploadWizard } from "@/components/upload-wizard";
import { useActivity } from "@/components/activity-store";
import { useModels } from "@/components/models-store";
import { useSettings } from "@/components/settings-store";
import { isLive, shortUrl, type ArModel, type ModelStatus } from "@/lib/models";
import { downloadBlob, qrZip } from "@/lib/qr";
import { cn } from "@/lib/cn";

type Filter = "all" | ModelStatus;
type Sort = "newest" | "scans" | "name";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Live" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Needs attention" },
  { value: "draft", label: "Drafts" },
  { value: "unpublished", label: "Unpublished" },
];

const sorters: Record<Sort, (a: ArModel, b: ArModel) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  scans: (a, b) => b.scans - a.scans,
  name: (a, b) => a.name.localeCompare(b.name),
};

function ModelMenu({ model, onDelete }: { model: ArModel; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="absolute right-3 top-3 z-10">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Actions for ${model.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-8 place-items-center rounded-lg bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200/70 backdrop-blur transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <EllipsisVertical className="size-4" />
      </button>
      {open && (
        <div role="menu" className="animate-fade-up absolute right-0 mt-1.5 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10">
          <Link role="menuitem" href={`/models/${model.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <Pencil className="size-4 text-slate-400" aria-hidden /> Edit
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (confirm(`Delete ${model.name}? Its link and QR code will stop working.`)) onDelete();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Thumbnail({ model }: { model: ArModel }) {
  if (model.status === "processing") {
    return (
      <div className="flex flex-col items-center gap-2 text-indigo-600">
        <LoaderCircle className="size-8 animate-spin" aria-hidden />
        <span className="text-xs font-medium">Generating… ~2 min</span>
      </div>
    );
  }
  if (model.status === "failed") {
    return (
      <div className="flex flex-col items-center gap-2 px-6 text-center text-rose-600">
        <AlertTriangle className="size-8" aria-hidden />
        <span className="line-clamp-2 text-xs">{model.failureReason ?? "Generation failed"}</span>
      </div>
    );
  }
  return model.thumbnailUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={model.thumbnailUrl}
      alt=""
      loading="lazy"
      className={cn("size-full object-contain p-4 transition group-hover:scale-105", model.status === "unpublished" && "opacity-50 grayscale")}
    />
  ) : (
    <Box className="size-14 text-slate-300 transition group-hover:scale-110 group-hover:text-indigo-400" strokeWidth={1.25} aria-hidden />
  );
}

function ModelCard({ model, onDelete, onRetry }: { model: ArModel; onDelete: () => void; onRetry: () => void }) {
  return (
    <Card className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
      <ModelMenu model={model} onDelete={onDelete} />
      <Link href={`/models/${model.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
        <div
          className={cn(
            "grid aspect-[4/3] place-items-center overflow-hidden",
            model.status === "failed" ? "bg-rose-50" : model.status === "processing" ? "bg-indigo-50/70" : "bg-gradient-to-br from-slate-50 to-slate-200/70",
          )}
        >
          <Thumbnail model={model} />
        </div>
        <div className="p-4">
          <h3 className="truncate font-medium text-slate-900">{model.name}</h3>
          {model.tags.length > 0 && <p className="mt-0.5 truncate text-xs text-slate-400">{model.tags.join(" · ")}</p>}
          <div className="mt-3 flex items-center justify-between">
            <Badge status={model.status} />
            {model.status !== "failed" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500" title="Total scans">
                <QrCode className="size-4 text-slate-400" aria-hidden />
                <span className="tabular-nums">{model.scans.toLocaleString("en-US")}</span>
                <span className="sr-only">scans</span>
              </span>
            )}
          </div>
        </div>
      </Link>
      {model.status === "failed" && (
        <div className="px-4 pb-4">
          <Button variant="secondary" size="sm" className="w-full" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden /> Retry for free
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { models, addModel, removeModel, retryModel } = useModels();
  const { settings } = useSettings();
  const { notify, completeOnboarding } = useActivity();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const counts = Object.fromEntries(filters.map((f) => [f.value, f.value === "all" ? models.length : models.filter((m) => m.status === f.value).length]));
  const tags = [...new Set(models.flatMap((m) => m.tags))].sort();
  const filtered = models
    .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    .filter((m) => filter === "all" || m.status === filter)
    .filter((m) => !tag || m.tags.includes(tag))
    .sort(sorters[sort]);
  const exportable = filtered.filter(isLive);

  const exportQrCodes = async () => {
    setExporting(true);
    try {
      const zip = await qrZip(
        exportable.map((m) => ({ name: m.name, url: `https://${shortUrl(m.slug, settings.viewerDomain)}` })),
        { color: settings.qrColor, errorCorrectionLevel: settings.qrErrorCorrection },
      );
      downloadBlob(zip, `qr-codes-${new Date().toISOString().slice(0, 10)}.zip`);
      completeOnboarding("qrDownloaded");
    } finally {
      setExporting(false);
    }
  };

  const retry = (m: ArModel) => {
    retryModel(m.id);
    notify({ kind: "info", title: `Retrying ${m.name}`, body: "Generation restarted. Retries don’t use a credit.", href: `/models/${m.id}` });
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-8">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              aria-label="Search models"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationsMenu />
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">Create New Model</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">My Models</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your 3D assets, AR links and QR codes.</p>
        </div>

        <OnboardingChecklist onCreate={() => setWizardOpen(true)} />

        <section aria-label="Models" className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
              {filters
                .filter((f) => f.value === "all" || counts[f.value] > 0)
                .map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    aria-pressed={filter === f.value}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      filter === f.value ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
                      f.value === "failed" && filter !== f.value && "text-rose-600",
                    )}
                  >
                    {f.label}
                    <span className={cn("tabular-nums text-xs", filter === f.value ? "text-slate-300" : "text-slate-400")}>{counts[f.value]}</span>
                  </button>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tags.length > 0 && (
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  aria-label="Filter by tag"
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All tags</option>
                  {tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort models"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="scans">Most scans</option>
                <option value="name">Name A–Z</option>
              </select>
              <Button variant="secondary" size="sm" onClick={exportQrCodes} disabled={!exportable.length || exporting} title="Download a ZIP with a QR code for every live model shown">
                {exporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
                QR codes ({exportable.length})
              </Button>
            </div>
          </div>

          {filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((m) => (
                <ModelCard key={m.id} model={m} onDelete={() => removeModel(m.id)} onRetry={() => retry(m)} />
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center px-6 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Search className="size-6" aria-hidden />
              </div>
              <p className="mt-4 font-medium text-slate-900">
                {query ? `No models match “${query}”` : models.length ? "No models match these filters" : "No models yet"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {models.length ? "Try another status or tag." : "Upload a video, photos or an existing 3D file to get started."}
              </p>
              {models.length ? (
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                    setTag("");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button className="mt-5" onClick={() => setWizardOpen(true)}>
                  <Plus className="size-4" aria-hidden /> Create New Model
                </Button>
              )}
            </Card>
          )}
        </section>
      </main>

      {wizardOpen && (
        <UploadWizard
          onClose={() => setWizardOpen(false)}
          onComplete={(input) => {
            const model = addModel(input);
            setWizardOpen(false);
            if (input.status === "active") router.push(`/models/${model.id}`);
          }}
        />
      )}
    </>
  );
}
