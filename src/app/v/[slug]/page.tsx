"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Box, ExternalLink, Ruler, ScanLine, Smartphone } from "lucide-react";
import { ModelViewer } from "@/components/model-viewer";
import { ModelsProvider, useModels } from "@/components/models-store";
import { SettingsProvider, useSettings } from "@/components/settings-store";
import { cn } from "@/lib/cn";

const SCAN_DEDUPE_MS = 30 * 60 * 1000;

const backgrounds = {
  light: "bg-[radial-gradient(circle_at_center,_#ffffff,_#e2e8f0)] text-slate-900",
  dark: "bg-[radial-gradient(circle_at_center,_#1e293b,_#020617)] text-white",
  transparent: "bg-transparent text-slate-900",
};

export default function ViewerPage() {
  return (
    <Suspense>
      <SettingsProvider>
        <ModelsProvider>
          <Viewer />
        </ModelsProvider>
      </SettingsProvider>
    </Suspense>
  );
}

function Unavailable({ title, text }: { title: string; text: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
          <Box className="size-7" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      </div>
    </main>
  );
}

function DesktopQr({ dark }: { dark: boolean }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(window.location.href.replace(/[?&]embed=1/, ""), { type: "svg", margin: 1, color: { dark: "#0f172a", light: "#ffffff" } }).then(setSvg);
  }, []);
  return (
    <div className={cn("hidden items-center gap-3 rounded-2xl p-3 shadow-lg md:flex", dark ? "bg-white/10 ring-1 ring-white/15" : "bg-white ring-1 ring-slate-200")}>
      <div className="size-20 rounded-lg bg-white p-1 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} aria-hidden />
      <div className="max-w-[11rem] text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <Smartphone className="size-4" aria-hidden /> View in your room
        </p>
        <p className={cn("mt-0.5 text-xs", dark ? "text-slate-300" : "text-slate-500")}>Scan with your phone camera to place it in AR.</p>
      </div>
    </div>
  );
}

function Viewer() {
  const { slug } = useParams<{ slug: string }>();
  const embed = useSearchParams().get("embed") === "1";
  const { models, hydrated, track } = useModels();
  const { settings } = useSettings();
  const model = models.find((m) => m.slug === slug);
  const live = model?.status === "active";

  useEffect(() => {
    if (!hydrated || !live) return;
    const key = `arcade3d.scan.${slug}`;
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < SCAN_DEDUPE_MS) return;
    sessionStorage.setItem(key, String(Date.now()));
    if (settings.trackScans) track(slug, "scan");
  }, [hydrated, live, slug, settings.trackScans, track]);

  useEffect(() => {
    if (model) document.title = `${model.name} · ${settings.workspaceName}`;
  }, [model, settings.workspaceName]);

  if (!hydrated) return <main className="min-h-dvh bg-slate-50" />;
  if (!model) return <Unavailable title="Model not found" text="This link may be mistyped, or the model was deleted." />;
  if (model.status === "processing") return <Unavailable title="Almost ready" text="This 3D model is still being prepared. Check back in a few minutes." />;
  if (!live) return <Unavailable title="This model isn’t available" text="It has been taken offline by its owner." />;

  const dark = settings.viewerBackground === "dark";
  const brand = settings.brandColor;
  const placement = model.placement === "default" ? settings.arPlacement : model.placement;
  const dims = model.dimensionsCm;

  return (
    <main className={cn("flex h-dvh flex-col", backgrounds[settings.viewerBackground])}>
      {!embed && (
        <header className="flex items-center justify-between px-5 py-4">
          <p className="font-semibold tracking-tight">{settings.workspaceName}</p>
          {dims && (
            <p className={cn("flex items-center gap-1.5 text-sm", dark ? "text-slate-300" : "text-slate-500")}>
              <Ruler className="size-4" aria-hidden /> {dims.w} × {dims.h} × {dims.d} cm
            </p>
          )}
        </header>
      )}

      <ModelViewer
        src={model.glbUrl}
        alt={`3D model of ${model.name}`}
        className="min-h-0 flex-1"
        ar
        arPlacement={placement}
        arScale={settings.arScale}
        autoRotate={settings.autoRotate}
        cameraControls={settings.cameraControls}
        shadowIntensity={settings.shadowIntensity}
        onArStart={() => settings.trackScans && track(slug, "arOpen")}
        arButton={
          <button
            slot="ar-button"
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
            style={{ backgroundColor: brand }}
          >
            <ScanLine className="size-4" aria-hidden /> View in your space
          </button>
        }
      />

      <footer className={cn("flex flex-wrap items-end justify-between gap-3", embed ? "p-3" : "px-5 pb-5")}>
        <div className="min-w-0">
          <h1 className={cn("truncate font-semibold tracking-tight", embed ? "text-base" : "text-xl")}>{model.name}</h1>
          {settings.showBranding && (
            <a
              href="/"
              target="_blank"
              className={cn("mt-1 inline-block text-xs", dark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}
            >
              Powered by Arcade3D
            </a>
          )}
        </div>
        <div className="flex items-end gap-3">
          {!embed && <DesktopQr dark={dark} />}
          {model.ctaUrl && (
            <a
              href={model.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => settings.trackScans && track(slug, "shopClick")}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              style={{ backgroundColor: brand }}
            >
              {model.ctaLabel || "Shop now"} <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </div>
      </footer>
    </main>
  );
}
