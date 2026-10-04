"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Calendar,
  Check,
  Code,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileBox,
  HardDrive,
  Layers,
  LoaderCircle,
  Lock,
  MousePointerClick,
  Pencil,
  RefreshCw,
  Ruler,
  ScanLine,
  Smartphone,
  Tag,
  Timer,
  Upload,
  X,
} from "lucide-react";
import { Badge, Button, Card, Input, Segmented, Toggle } from "@/components/ui";
import { ModelViewer } from "@/components/model-viewer";
import { ScanChart } from "@/components/scan-chart";
import { useActivity } from "@/components/activity-store";
import { useBilling } from "@/components/billing-store";
import { useModels } from "@/components/models-store";
import { useSettings } from "@/components/settings-store";
import { formatStorage } from "@/lib/billing";
import { dailyScans, formatDate, isLive, shortUrl, viewerPath, type ArModel, type Placement } from "@/lib/models";
import { downloadBlob, downloadHref, fileSafe, qrPngDataUrl, qrSvg } from "@/lib/qr";
import { cn } from "@/lib/cn";

const presetSwatches = [
  { name: "Midnight", value: "#0f172a" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Emerald", value: "#047857" },
];

const isHttpsUrl = (s: string) => {
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
};

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return { copied, copy };
}

function SectionCard({ title, icon: Icon, description, children, action }: { title: string; icon: typeof Box; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-4 text-slate-400" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function NameEditor({ model, onRename }: { model: ArModel; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(model.name);

  const commit = () => {
    const name = value.trim();
    if (name) onRename(name);
    else setValue(model.name);
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
        className="flex-1"
      >
        <input
          autoFocus
          aria-label="Model name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setValue(model.name);
              setEditing(false);
            }
          }}
          className="w-full rounded-lg border border-indigo-300 bg-white px-2 py-1 text-2xl font-semibold tracking-tight focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
        />
      </form>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="group flex items-center gap-2 text-left" aria-label={`Rename ${model.name}`}>
      <h1 className="text-2xl font-semibold tracking-tight">{model.name}</h1>
      <Pencil className="size-4 text-slate-300 transition group-hover:text-slate-500" aria-hidden />
    </button>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const tag = value.trim();
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...tags, tag]);
    setValue("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag className="size-3.5 text-slate-400" aria-hidden />
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-slate-700">
          {t}
          <button onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="grid size-4 place-items-center rounded-full hover:bg-slate-200">
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Add tag…"
        aria-label="Add tag"
        className="w-24 rounded-full bg-transparent px-2 py-0.5 text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />
    </div>
  );
}

function Preview({ model, onRetry, onReplace }: { model: ArModel; onRetry: () => void; onReplace: (file: File) => void }) {
  const { settings } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = model.status !== "processing" && model.status !== "failed";
  const placement = model.placement === "default" ? settings.arPlacement : model.placement;

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-square bg-[radial-gradient(circle_at_center,_#ffffff,_#e2e8f0)]">
        {ready ? (
          <ModelViewer
            src={model.glbUrl}
            alt={`3D model of ${model.name}`}
            className="size-full"
            ar
            arPlacement={placement}
            arScale={settings.arScale}
            autoRotate={settings.autoRotate}
            shadowIntensity={settings.shadowIntensity}
          />
        ) : model.status === "processing" ? (
          <div className="flex size-full flex-col items-center justify-center p-8 text-center" aria-live="polite">
            <div className="relative" style={{ perspective: 400 }}>
              <div className="cube relative size-14">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            </div>
            <p className="mt-8 font-medium text-slate-900">Generating your 3D model…</p>
            <p className="mt-1 text-sm text-slate-500">This usually takes 2–3 minutes. We’ll notify you when it’s ready.</p>
          </div>
        ) : (
          <div className="flex size-full flex-col items-center justify-center p-8 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="size-6" aria-hidden />
            </div>
            <p className="mt-4 font-medium text-slate-900">Generation failed</p>
            <p className="mt-1 max-w-sm text-sm text-slate-600">{model.failureReason ?? "The 3D engine couldn’t reconstruct this capture."}</p>
            <div className="mt-5 flex gap-2">
              <Button onClick={onRetry}>
                <RefreshCw className="size-4" aria-hidden /> Retry for free
              </Button>
              <Link href="/help#capture-guide" className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-white/70">
                Capture tips
              </Link>
            </div>
          </div>
        )}
      </div>
      {ready && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Smartphone className="size-3.5" aria-hidden /> Drag to rotate · pinch to zoom
          </p>
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" aria-hidden /> Replace 3D file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".glb,model/gltf-binary"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </Card>
  );
}

function QrCard({ model, url, live }: { model: ArModel; url: string; live: boolean }) {
  const { settings } = useSettings();
  const { updateModel } = useModels();
  const { completeOnboarding } = useActivity();
  const [color, setColor] = useState(settings.qrColor);
  const [svg, setSvg] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => setColor(settings.qrColor), [settings.qrColor]);

  const swatches = presetSwatches.some((s) => s.value === settings.qrColor)
    ? presetSwatches
    : [{ name: "Workspace default", value: settings.qrColor }, ...presetSwatches];
  const style = useMemo(() => ({ color, errorCorrectionLevel: settings.qrErrorCorrection }), [color, settings.qrErrorCorrection]);
  const fullUrl = `https://${url}`;

  useEffect(() => {
    qrSvg(fullUrl, style).then(setSvg);
  }, [fullUrl, style]);

  const downloadPng = async () => {
    downloadHref(await qrPngDataUrl(fullUrl, style), `${fileSafe(model.name)}-qr.png`);
    completeOnboarding("qrDownloaded");
  };
  const downloadSvg = () => {
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileSafe(model.name)}-qr.svg`);
    completeOnboarding("qrDownloaded");
  };
  const unlock = () => {
    setPaying(true);
    setTimeout(() => {
      updateModel(model.id, { status: "active" });
      setPaying(false);
    }, 1400);
  };

  const lockMessage =
    model.status === "draft"
      ? null
      : model.status === "unpublished"
        ? "Publish this model to activate its QR code"
        : model.status === "processing"
          ? "Your QR code appears once generation finishes"
          : "Retry generation to get a QR code";

  return (
    <Card className="relative overflow-hidden p-5">
      <h2 className="text-sm font-semibold text-slate-900">QR Code</h2>
      <div className={cn("mt-4 flex flex-col gap-5 sm:flex-row sm:items-center", !live && "pointer-events-none select-none blur-sm")} aria-hidden={!live}>
        <div
          className="size-44 shrink-0 rounded-xl border border-slate-200 bg-white p-2 [&>svg]:size-full"
          role="img"
          aria-label={`QR code linking to ${url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex-1 space-y-3">
          <p className="text-sm text-slate-500">Print it on packaging, flyers or in-store displays. Scanning opens the model in AR, with no app needed.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={downloadPng} tabIndex={live ? 0 : -1}>
              <Download className="size-4" aria-hidden /> PNG
            </Button>
            <Button variant="secondary" size="sm" onClick={downloadSvg} tabIndex={live ? 0 : -1}>
              <Download className="size-4" aria-hidden /> SVG
            </Button>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p id="qr-color" className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Color
            </p>
            <div role="radiogroup" aria-labelledby="qr-color" className="mt-2 flex gap-3">
              {swatches.map((s) => (
                <button
                  key={s.value}
                  role="radio"
                  aria-checked={color === s.value}
                  aria-label={s.name}
                  title={s.name}
                  tabIndex={live ? 0 : -1}
                  onClick={() => setColor(s.value)}
                  style={{ backgroundColor: s.value }}
                  className={cn(
                    "grid size-9 place-items-center rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    color === s.value ? "ring-2 ring-slate-900/80" : "hover:scale-110",
                  )}
                >
                  {color === s.value && <Check className="size-4 text-white" strokeWidth={3} aria-hidden />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {!live && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 p-6 text-center backdrop-blur-[1px]">
          <div className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-600">
            <Lock className="size-5" aria-hidden />
          </div>
          {lockMessage ? (
            <p className="mt-3 text-sm font-medium text-slate-900">{lockMessage}</p>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium text-slate-900">Unlock AR hosting to get your QR code</p>
              <Button className="mt-4" onClick={unlock} disabled={paying}>
                {paying ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
                {paying ? "Redirecting to Stripe…" : "Checkout with Stripe ($4.99)"}
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function EmbedCard({ model, url }: { model: ArModel; url: string }) {
  const { completeOnboarding } = useActivity();
  const { copied, copy } = useCopy();
  const [height, setHeight] = useState(480);
  const snippet = `<iframe src="https://${url}?embed=1" title="${model.name.replace(/"/g, "&quot;")} in 3D and AR" width="100%" height="${height}" style="border:0;border-radius:16px" allow="xr-spatial-tracking; fullscreen" loading="lazy"></iframe>`;

  return (
    <SectionCard
      title="Add to your website"
      icon={Code}
      description="Paste on a product page to show the 3D model with a “View in your space” button."
      action={
        <Link href={`${viewerPath(model.slug)}?embed=1`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
          Preview <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      }
    >
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-3.5 font-mono text-xs leading-relaxed text-slate-100">{snippet}</pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Height
          <select
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {[360, 480, 600].map((h) => (
              <option key={h} value={h}>
                {h}px
              </option>
            ))}
          </select>
        </label>
        <Button
          size="sm"
          onClick={() => {
            copy(snippet);
            completeOnboarding("embedCopied");
          }}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy embed code"}
        </Button>
      </div>
    </SectionCard>
  );
}

function CtaCard({ model, onChange }: { model: ArModel; onChange: (patch: Partial<ArModel>) => void }) {
  const { settings } = useSettings();
  const urlError = model.ctaUrl && !isHttpsUrl(model.ctaUrl) ? "Use a full https:// link to your product page" : undefined;
  return (
    <SectionCard title="Buy button" icon={MousePointerClick} description="Shown in the viewer next to the AR button. Clicks are tracked in Analytics.">
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Input id="cta-label" label="Button text" value={model.ctaLabel} placeholder="Shop now" maxLength={24} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
        <div>
          <Input
            id="cta-url"
            label="Product page URL"
            type="url"
            value={model.ctaUrl}
            placeholder="https://yourshop.com/products/…"
            aria-invalid={!!urlError}
            aria-describedby={urlError ? "cta-url-error" : undefined}
            onChange={(e) => onChange({ ctaUrl: e.target.value.trim() })}
          />
          {urlError && (
            <p id="cta-url-error" className="mt-1.5 text-xs text-rose-600">
              {urlError}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        Preview
        {model.ctaUrl ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white" style={{ backgroundColor: settings.brandColor }}>
            {model.ctaLabel || "Shop now"} <ExternalLink className="size-3.5" aria-hidden />
          </span>
        ) : (
          <span>Add a product URL to show the button.</span>
        )}
      </div>
    </SectionCard>
  );
}

function ArSettingsCard({ model, onChange }: { model: ArModel; onChange: (patch: Partial<ArModel>) => void }) {
  const { settings } = useSettings();
  const dims = model.dimensionsCm;
  const setDim = (key: "w" | "h" | "d", v: string) => onChange({ dimensionsCm: { ...(dims ?? { w: 0, h: 0, d: 0 }), [key]: Math.max(0, Number(v) || 0) } });

  return (
    <SectionCard title="AR placement & size" icon={Ruler} description="How the model is placed when someone opens it in their space.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span id="placement-label" className="text-sm font-medium text-slate-700">
          Placement
        </span>
        <Segmented<Placement>
          id="placement"
          value={model.placement}
          onChange={(placement) => onChange({ placement })}
          options={[
            { value: "default", label: `Default (${settings.arPlacement})` },
            { value: "floor", label: "Floor" },
            { value: "wall", label: "Wall" },
          ]}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p id="real-size-label" className="text-sm font-medium text-slate-700">
            Real-world size
          </p>
          <p className="text-sm text-slate-500">Shown to visitors, and used to check the AR scale is right.</p>
        </div>
        <Toggle label="Set real-world size" checked={!!dims} onChange={(on) => onChange({ dimensionsCm: on ? { w: 0, h: 0, d: 0 } : null })} />
      </div>
      {dims && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {(
            [
              ["w", "Width"],
              ["h", "Height"],
              ["d", "Depth"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs font-medium text-slate-500">
              {label} (cm)
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={dims[key] || ""}
                onChange={(e) => setDim(key, e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
            </label>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function PerformanceCard({ model }: { model: ArModel }) {
  const series = useMemo(() => dailyScans(model).slice(-30), [model]);
  const last30 = series.reduce((s, v) => s + v, 0);
  const pct = (n: number) => (model.scans ? `${((n / model.scans) * 100).toFixed(1)}%` : "—");
  const stats = [
    { icon: ScanLine, label: "Scans", value: model.scans.toLocaleString("en-US"), sub: "all time" },
    { icon: Smartphone, label: "AR opens", value: model.arOpens.toLocaleString("en-US"), sub: `${pct(model.arOpens)} of scans` },
    { icon: MousePointerClick, label: "Shop clicks", value: model.shopClicks.toLocaleString("en-US"), sub: `${pct(model.shopClicks)} of scans` },
    { icon: Timer, label: "Avg. time", value: model.avgSessionSec ? `${model.avgSessionSec}s` : "—", sub: "per visit" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Scans over the last 30 days</h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{last30.toLocaleString("en-US")}</p>
        </div>
        <Link href="/analytics" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
          All analytics →
        </Link>
      </div>
      <div className="mt-4">
        {model.scans ? (
          <ScanChart data={series} />
        ) : (
          <div className="grid h-44 place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
            Scans will appear here once the model is live.
          </div>
        )}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <div key={label}>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <Icon className="size-3.5" aria-hidden /> {label}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
            <dd className="text-xs text-slate-400">{sub}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { models, hydrated, updateModel, retryModel } = useModels();
  const { settings } = useSettings();
  const { plan } = useBilling();
  const { notify } = useActivity();
  const { copied, copy } = useCopy();
  const [notice, setNotice] = useState("");
  const model = models.find((m) => m.id === id);

  if (!model) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <BackLink />
        {hydrated && (
          <Card className="mt-6 flex flex-col items-center px-6 py-16 text-center">
            <Box className="size-10 text-slate-300" aria-hidden />
            <p className="mt-4 font-medium">Model not found</p>
            <p className="mt-1 text-sm text-slate-500">It may have been deleted.</p>
          </Card>
        )}
      </main>
    );
  }

  const live = isLive(model);
  const url = shortUrl(model.slug, settings.viewerDomain);
  const liveCount = models.filter(isLive).length;
  const slotsFull = plan.liveModels !== null && liveCount >= plan.liveModels;
  const canToggle = model.status === "active" || model.status === "unpublished";
  const change = (patch: Partial<ArModel>) => updateModel(model.id, patch);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3000);
  };

  const setPublished = (on: boolean) => {
    change({ status: on ? "active" : "unpublished" });
    flash(on ? "Published. The link and QR code work again." : "Unpublished. Visitors now see an “unavailable” page.");
  };

  const replaceFile = (file: File) => {
    change({ glbUrl: URL.createObjectURL(file), thumbnailUrl: undefined, fileSize: formatStorage(file.size / 1024 / 1024), source: "upload" });
    flash("3D file replaced. The link and QR code stay the same.");
  };

  const retry = () => {
    retryModel(model.id);
    notify({ kind: "info", title: `Retrying ${model.name}`, body: "Generation restarted. Retries don’t use a credit.", href: `/models/${model.id}` });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <BackLink />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Preview model={model} onRetry={retry} onReplace={replaceFile} />

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Technical details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {[
                { icon: HardDrive, label: "File size", value: model.fileSize },
                { icon: FileBox, label: "Format", value: ".glb (USDZ generated for iOS)" },
                { icon: Layers, label: "Polygons", value: model.polygons },
                { icon: Calendar, label: "Created", value: formatDate(model.createdAt) },
                { icon: Upload, label: "Source", value: model.source === "upload" ? "Uploaded 3D file" : "Generated from capture" },
                { icon: Ruler, label: "Real size", value: model.dimensionsCm ? `${model.dimensionsCm.w} × ${model.dimensionsCm.h} × ${model.dimensionsCm.d} cm` : "Not set" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <Icon className="size-4 shrink-0 text-slate-400" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="truncate text-sm font-medium text-slate-900">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>

          <ArSettingsCard model={model} onChange={change} />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <NameEditor key={model.id} model={model} onRename={(name) => change({ name })} />
              <Badge status={model.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">Created {formatDate(model.createdAt)}</p>
            <div className="mt-3">
              <TagEditor tags={model.tags} onChange={(tags) => change({ tags })} />
            </div>
          </div>

          {canToggle && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p id="publish-label" className="text-sm font-semibold text-slate-900">
                  {live ? "Live" : "Offline"}
                </p>
                <p className="text-sm text-slate-500">
                  {live
                    ? "Anyone with the link or QR code can view it."
                    : slotsFull
                      ? `All ${plan.liveModels} live slots on ${plan.name} are used. Unpublish another model or upgrade.`
                      : "Unpublished models keep their files and stats but don’t use a live slot."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {live && (
                  <Link href={viewerPath(model.slug)} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Open viewer <ExternalLink className="size-3.5" aria-hidden />
                  </Link>
                )}
                <Toggle label="Published" checked={live} onChange={setPublished} disabled={!live && slotsFull} />
              </div>
            </Card>
          )}

          {notice && (
            <p role="status" className="animate-fade-up flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
              <Check className="size-4" aria-hidden /> {notice}
            </p>
          )}

          <QrCard model={model} url={url} live={live} />

          <Card className="p-5">
            <label htmlFor="share-link" className="text-sm font-semibold text-slate-900">
              Share link
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="share-link"
                readOnly
                value={live ? url : "Available once the model is live"}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-mono text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
              <Button onClick={() => copy(`https://${url}`)} disabled={!live} className="shrink-0">
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </div>
          </Card>

          {live && <EmbedCard model={model} url={url} />}
          <CtaCard model={model} onChange={change} />
          <PerformanceCard model={model} />
        </div>
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
      <ArrowLeft className="size-4" aria-hidden /> Back to Dashboard
    </Link>
  );
}
