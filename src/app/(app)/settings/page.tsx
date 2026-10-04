"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Box,
  Check,
  ChartColumn,
  Code,
  Copy,
  Eye,
  EyeOff,
  Palette,
  RefreshCw,
  ScanLine,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button, Card, Input, Segmented, Toggle } from "@/components/ui";
import { useBilling } from "@/components/billing-store";
import { useModels } from "@/components/models-store";
import { TeamSettings } from "@/components/team-settings";
import { downloadBlob } from "@/lib/qr";
import { defaultSettings, newApiKey, useSettings, type Settings } from "@/components/settings-store";
import { cn } from "@/lib/cn";

const sections: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Workspace & branding", icon: Palette },
  { id: "team", label: "Team", icon: Users },
  { id: "viewer", label: "AR viewer & QR", icon: ScanLine },
  { id: "processing", label: "3D processing", icon: Box },
  { id: "analytics", label: "Analytics & privacy", icon: ChartColumn },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "developers", label: "API & webhooks", icon: Code },
  { id: "danger", label: "Data & deletion", icon: TriangleAlert },
];

const colorPresets = [
  { name: "Midnight", value: "#0f172a" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Emerald", value: "#047857" },
  { name: "Rose", value: "#e11d48" },
];

type Errors = Partial<Record<keyof Settings, string>>;

const isHttpsUrl = (s: string) => {
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
};

function validate(s: Settings): Errors {
  const e: Errors = {};
  if (!s.name.trim()) e.name = "Enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) e.email = "Enter a valid email address";
  if (!s.workspaceName.trim()) e.workspaceName = "Enter a workspace name";
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(s.viewerDomain)) {
    e.viewerDomain = "Enter a domain like ar.example.com, without https://";
  }
  if (s.webhookUrl && !isHttpsUrl(s.webhookUrl)) e.webhookUrl = "Use a full https:// URL";
  return e;
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <Card id={id} className={cn("scroll-mt-8 p-5 sm:p-6", id === "danger" && "border-rose-200")}>
      <h2 className={cn("font-semibold", id === "danger" ? "text-rose-700" : "text-slate-900")}>{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 divide-y divide-slate-100">{children}</div>
    </Card>
  );
}

function Row({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  ...props
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: ReactNode;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const describedBy = error || hint ? `${id}-help` : undefined;
  return (
    <div>
      <Input
        id={id}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15")}
        {...props}
      />
      {(error || hint) && (
        <p id={describedBy} className={cn("mt-1.5 text-xs", error ? "text-rose-600" : "text-slate-500")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

function Select<T extends string | number>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      id={id}
      value={String(value)}
      onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)}
      className="h-10 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ColorField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const isPreset = colorPresets.some((p) => p.value === value);
  return (
    <div id={id} role="radiogroup" aria-labelledby={`${id}-label`} className="flex items-center gap-2.5">
      {colorPresets.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={value === p.value}
          aria-label={p.name}
          title={p.name}
          onClick={() => onChange(p.value)}
          style={{ backgroundColor: p.value }}
          className={cn(
            "grid size-8 place-items-center rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            value === p.value ? "ring-2 ring-slate-900/80" : "hover:scale-110",
          )}
        >
          {value === p.value && <Check className="size-4 text-white" strokeWidth={3} aria-hidden />}
        </button>
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Custom color"
        title="Custom color"
        className={cn(
          "size-8 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5 ring-offset-2 [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0",
          !isPreset && "ring-2 ring-slate-900/80",
        )}
      />
      <span className="w-16 font-mono text-xs uppercase text-slate-500">{value}</span>
    </div>
  );
}

function ApiKeyField({ value, onRegenerate }: { value: string; onRegenerate: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const masked = `${value.slice(0, 8)}${"•".repeat(16)}${value.slice(-4)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code id="api-key" className="h-10 min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-mono text-sm leading-10 text-slate-700">
        {revealed ? value : masked}
      </code>
      <Button variant="secondary" size="sm" onClick={() => setRevealed((r) => !r)} aria-label={revealed ? "Hide API key" : "Show API key"}>
        {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </Button>
      <Button variant="secondary" size="sm" onClick={copy}>
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <Button variant="secondary" size="sm" onClick={onRegenerate}>
        <RefreshCw className="size-4" aria-hidden /> Regenerate
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, saveSettings } = useSettings();
  const { models, removeModel } = useModels();
  const { billing, plan } = useBilling();
  const [draft, setDraft] = useState(settings);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const errors = validate(draft);
  const valid = Object.keys(errors).length === 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    if (!valid) return;
    saveSettings({ ...draft, name: draft.name.trim(), workspaceName: draft.workspaceName.trim(), viewerDomain: draft.viewerDomain.toLowerCase() });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const regenerateKey = () => {
    if (confirm("Regenerate the API key? Integrations using the current key stop working once you save.")) set("apiKey")(newApiKey());
  };

  const resetSettings = () => {
    if (confirm("Reset every setting to its default value?")) saveSettings(defaultSettings);
  };

  const deleteAllModels = () => {
    if (confirm(`Permanently delete all ${models.length} models? Their QR codes and links will stop working.`)) {
      models.forEach((m) => removeModel(m.id));
    }
  };

  const exportData = () => {
    const data = { exportedAt: new Date().toISOString(), settings: { ...settings, apiKey: undefined }, models, billing };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `arcade3d-export-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const deleteAccount = () => {
    const answer = prompt(`This permanently deletes ${settings.workspaceName}, all models, QR codes, scan history and invoices, and cancels your plan.\n\nType DELETE to confirm.`);
    if (answer !== "DELETE") return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith("arcade3d."))
      .forEach((k) => localStorage.removeItem(k));
    window.location.href = "/";
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Workspace, AR viewer, processing and integration preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-8 space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-white hover:text-slate-900",
                    id === "danger" ? "text-rose-600" : "text-slate-600",
                  )}
                >
                  <Icon className="size-4 opacity-70" aria-hidden />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <Section id="profile" title="Profile" description="Your personal details. The email also receives notifications and receipts.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="name" label="Full name" value={draft.name} onChange={set("name")} error={errors.name} autoComplete="name" />
              <TextField id="email" label="Email" type="email" value={draft.email} onChange={set("email")} error={errors.email} autoComplete="email" />
            </div>
          </Section>

          <Section id="workspace" title="Workspace & branding" description="How your AR experiences look to the people scanning them.">
            <div className="grid gap-4 pb-4 sm:grid-cols-2">
              <TextField id="workspaceName" label="Workspace name" value={draft.workspaceName} onChange={set("workspaceName")} error={errors.workspaceName} />
              <TextField
                id="viewerDomain"
                label="Viewer domain"
                value={draft.viewerDomain}
                onChange={(v) => set("viewerDomain")(v.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, ""))}
                error={errors.viewerDomain}
                placeholder="ar.example.com"
                hint={
                  <>
                    Links and QR codes open <span className="font-mono">https://{draft.viewerDomain || "…"}/&lt;slug&gt;</span>. Point a CNAME at the app first.
                  </>
                }
              />
            </div>
            <Row id="brandColor" label="Brand color" hint="Buttons and loading bar in the AR viewer.">
              <ColorField id="brandColor" value={draft.brandColor} onChange={set("brandColor")} />
            </Row>
            <Row id="showBranding" label="Show “Powered by Arcade3D”" hint="Badge in the corner of the viewer.">
              <Toggle id="showBranding" checked={draft.showBranding} onChange={set("showBranding")} />
            </Row>
          </Section>

          <Section
            id="team"
            title="Team"
            description={`People who can work in ${draft.workspaceName || "this workspace"}. ${plan.seats === null ? "Unlimited seats" : `${draft.team.length} of ${plan.seats} seats used`} on ${plan.name}.`}
          >
            <TeamSettings team={draft.team} onChange={set("team")} seatLimit={plan.seats} />
          </Section>

          <Section id="viewer" title="AR viewer & QR" description="Defaults for every model. Individual models can still override the QR color.">
            <Row id="qrColor" label="Default QR color" hint="Keep it dark on a light background so phones scan it reliably.">
              <ColorField id="qrColor" value={draft.qrColor} onChange={set("qrColor")} />
            </Row>
            <Row id="qrErrorCorrection" label="QR error correction" hint="Higher survives scratches, logos and small prints, but makes a denser code.">
              <Segmented
                id="qrErrorCorrection"
                value={draft.qrErrorCorrection}
                onChange={set("qrErrorCorrection")}
                options={[
                  { value: "L", label: "Low" },
                  { value: "M", label: "Medium" },
                  { value: "Q", label: "High" },
                  { value: "H", label: "Max" },
                ]}
              />
            </Row>
            <Row id="viewerBackground" label="Viewer background" hint="Shown in the 3D preview before AR is opened.">
              <Segmented
                id="viewerBackground"
                value={draft.viewerBackground}
                onChange={set("viewerBackground")}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "transparent", label: "Transparent" },
                ]}
              />
            </Row>
            <Row id="autoRotate" label="Auto-rotate preview" hint="Slowly spins the model until the visitor touches it.">
              <Toggle id="autoRotate" checked={draft.autoRotate} onChange={set("autoRotate")} />
            </Row>
            <Row id="cameraControls" label="Allow zoom & rotate" hint="Let visitors orbit and pinch-zoom the 3D preview.">
              <Toggle id="cameraControls" checked={draft.cameraControls} onChange={set("cameraControls")} />
            </Row>
            <Row id="arPlacement" label="AR placement" hint="Floor for furniture and shoes, wall for art, signs and TVs.">
              <Segmented
                id="arPlacement"
                value={draft.arPlacement}
                onChange={set("arPlacement")}
                options={[
                  { value: "floor", label: "Floor" },
                  { value: "wall", label: "Wall" },
                ]}
              />
            </Row>
            <Row id="arScale" label="AR scaling" hint="Fixed keeps products at real-world size; auto lets visitors resize.">
              <Segmented
                id="arScale"
                value={draft.arScale}
                onChange={set("arScale")}
                options={[
                  { value: "fixed", label: "Real size" },
                  { value: "auto", label: "Resizable" },
                ]}
              />
            </Row>
            <Row id="shadowIntensity" label="Shadow intensity" hint="Ground shadow under the model in preview and AR.">
              <div className="flex items-center gap-3">
                <input
                  id="shadowIntensity"
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={draft.shadowIntensity}
                  onChange={(e) => set("shadowIntensity")(Number(e.target.value))}
                  className="w-40 accent-indigo-600"
                />
                <span className="w-8 text-right text-sm tabular-nums text-slate-600">{draft.shadowIntensity.toFixed(1)}</span>
              </div>
            </Row>
          </Section>

          <Section id="processing" title="3D processing" description="Defaults for new captures sent to the 3D engine. Each job uses one credit.">
            <Row id="modelQuality" label="Mesh quality" hint="Higher keeps more detail but produces heavier files.">
              <Segmented
                id="modelQuality"
                value={draft.modelQuality}
                onChange={set("modelQuality")}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
            </Row>
            <Row id="textureQuality" label="Texture resolution" hint="2K is sharp on phones; 4K mostly adds download time.">
              <Segmented
                id="textureQuality"
                value={draft.textureQuality}
                onChange={set("textureQuality")}
                options={[
                  { value: "1k", label: "1K" },
                  { value: "2k", label: "2K" },
                  { value: "4k", label: "4K" },
                ]}
              />
            </Row>
            <Row id="autoMask" label="Remove background" hint="Automatically cut the product out of its surroundings.">
              <Toggle id="autoMask" checked={draft.autoMask} onChange={set("autoMask")} />
            </Row>
            <Row id="dracoCompression" label="Draco compression" hint="Shrinks geometry, often by 70–90%, with no visible loss.">
              <Toggle id="dracoCompression" checked={draft.dracoCompression} onChange={set("dracoCompression")} />
            </Row>
            <Row id="maxFileSizeMb" label="Heavy model warning" hint="Flag models above this size in Analytics; they load slowly on mobile data.">
              <Select
                id="maxFileSizeMb"
                value={draft.maxFileSizeMb}
                onChange={set("maxFileSizeMb")}
                options={[2, 5, 10, 20].map((v) => ({ value: v, label: `${v} MB` }))}
              />
            </Row>
          </Section>

          <Section id="analytics" title="Analytics & privacy" description="What is recorded when someone scans a QR code or opens a link.">
            <Row id="trackScans" label="Track scans" hint="Count scans with time and device type (iOS, Android, other).">
              <Toggle id="trackScans" checked={draft.trackScans} onChange={set("trackScans")} />
            </Row>
            <Row id="collectCountry" label="Record country" hint="Derived from the IP address, which is never stored.">
              <Toggle id="collectCountry" checked={draft.collectCountry} onChange={set("collectCountry")} disabled={!draft.trackScans} />
            </Row>
            <Row id="retentionDays" label="Keep scan data for" hint="Older scan events are deleted automatically.">
              <Select
                id="retentionDays"
                value={draft.retentionDays}
                onChange={set("retentionDays")}
                options={[
                  { value: 90, label: "90 days" },
                  { value: 180, label: "6 months" },
                  { value: 365, label: "1 year" },
                  { value: 730, label: "2 years" },
                ]}
              />
            </Row>
          </Section>

          <Section id="notifications" title="Notifications" description={`Emails sent to ${draft.email || "your address"}.`}>
            <Row id="notifyModelReady" label="Model ready" hint="When processing finishes and the model is live.">
              <Toggle id="notifyModelReady" checked={draft.notifyModelReady} onChange={set("notifyModelReady")} />
            </Row>
            <Row id="notifyModelFailed" label="Processing failed" hint="When a capture can't be turned into a 3D model.">
              <Toggle id="notifyModelFailed" checked={draft.notifyModelFailed} onChange={set("notifyModelFailed")} />
            </Row>
            <Row id="notifyStorage" label="Storage almost full" hint="At 80% of your plan's storage.">
              <Toggle id="notifyStorage" checked={draft.notifyStorage} onChange={set("notifyStorage")} />
            </Row>
            <Row id="notifyWeeklyReport" label="Weekly scan report" hint="Scans, top models and trends every Monday.">
              <Toggle id="notifyWeeklyReport" checked={draft.notifyWeeklyReport} onChange={set("notifyWeeklyReport")} />
            </Row>
          </Section>

          <Section id="developers" title="API & webhooks" description="Create models from your own systems and get notified when they're ready.">
            <div className="space-y-1.5 pb-4">
              <label htmlFor="api-key" className="block text-sm font-medium text-slate-700">
                API key
              </label>
              <ApiKeyField value={draft.apiKey} onRegenerate={regenerateKey} />
              <p className="text-xs text-slate-500">
                Send as <span className="font-mono">Authorization: Bearer &lt;key&gt;</span>. Keep it secret; never ship it in frontend code.
              </p>
            </div>
            <div className="pt-4">
              <TextField
                id="webhookUrl"
                label="Webhook URL"
                type="url"
                value={draft.webhookUrl}
                onChange={(v) => set("webhookUrl")(v.trim())}
                error={errors.webhookUrl}
                placeholder="https://example.com/hooks/arcade3d"
                hint={
                  <>
                    Receives <span className="font-mono">model.completed</span> and <span className="font-mono">model.failed</span> events. Leave empty to disable.
                  </>
                }
              />
            </div>
          </Section>

          <Section id="danger" title="Your data & danger zone" description="Export everything at any time. Deleting can't be undone.">
            <Row id="export" label="Export all data" hint="Settings, models, analytics counts and invoices as a JSON file (GDPR data export).">
              <Button id="export" variant="secondary" size="sm" onClick={exportData}>
                Download export
              </Button>
            </Row>
            <Row id="reset" label="Reset settings" hint="Restore every option on this page to its default.">
              <Button id="reset" variant="secondary" size="sm" onClick={resetSettings}>
                Reset to defaults
              </Button>
            </Row>
            <Row id="delete-models" label="Delete all models" hint="Removes every model, its files, QR codes and scan history.">
              <Button
                id="delete-models"
                size="sm"
                onClick={deleteAllModels}
                disabled={!models.length}
                className="bg-rose-600 shadow-rose-600/30 hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-300"
              >
                Delete {models.length} model{models.length === 1 ? "" : "s"}
              </Button>
            </Row>
            <Row id="delete-account" label="Delete account" hint="Deletes the workspace, every model and all data, and cancels your subscription.">
              <Button id="delete-account" variant="danger" size="sm" onClick={deleteAccount} className="ring-1 ring-inset ring-rose-200">
                Delete account
              </Button>
            </Row>
          </Section>
        </div>
      </div>

      {(dirty || justSaved) && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-8 lg:left-64">
          <div className="animate-fade-up mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur">
            {dirty ? (
              <>
                <p className="text-sm text-slate-600">{valid ? "You have unsaved changes." : "Fix the highlighted fields to save."}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDraft(settings)}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={save} disabled={!valid}>
                    Save changes
                  </Button>
                </div>
              </>
            ) : (
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Check className="size-4" aria-hidden /> Settings saved
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
