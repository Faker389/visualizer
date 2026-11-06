"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Box, ExternalLink, Ruler, ScanLine, Smartphone } from "lucide-react";
import { ModelViewer, type ModelViewerHandle } from "@/components/model-viewer";
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

type RemoteModel = { name: string; glbUrl: string };

function sceneViewerIntent(glbUrl: string, name: string) {
  const query = new URLSearchParams({
    file: glbUrl,
    mode: "ar_preferred",
    title: name,
    resizable: "true",
    enable_vertical_placement: "true",
  });
  const fallback = encodeURIComponent(window.location.href);
  return `intent://arvr.google.com/scene-viewer/1.0?${query.toString()}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end;`;
}

function Viewer() {
  const { slug } = useParams<{ slug: string }>();
  const embed = useSearchParams().get("embed") === "1";
  const { models, hydrated, track } = useModels();
  const { settings } = useSettings();
  const local = models.find((m) => m.slug === slug);
  const [remote, setRemote] = useState<RemoteModel | null | undefined>(undefined);
  const [phone, setPhone] = useState<"android" | "ios" | "other" | null>(null);
  const [meshReady, setMeshReady] = useState(false);
  const viewerRef = useRef<ModelViewerHandle>(null);
  const live = local ? local.status === "active" : Boolean(remote);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) setPhone("android");
    else if (/iPhone|iPad|iPod/i.test(ua)) setPhone("ios");
    else setPhone("other");
  }, []);

  useEffect(() => {
    if (!hydrated || local) return;
    let cancelled = false;
    fetch(`/api/view/${slug}`)
      .then((res) => (res.ok ? (res.json() as Promise<RemoteModel>) : null))
      .then((data) => {
        if (!cancelled) setRemote(data);
      })
      .catch(() => {
        if (!cancelled) setRemote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, local, slug]);

  useEffect(() => {
    if (!hydrated || !live) return;
    const key = `arcade3d.scan.${slug}`;
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < SCAN_DEDUPE_MS) return;
    sessionStorage.setItem(key, String(Date.now()));
    if (settings.trackScans) track(slug, "scan");
  }, [hydrated, live, slug, settings.trackScans, track]);

  const view = local
    ? { name: local.name, glbUrl: local.glbUrl, ctaUrl: local.ctaUrl, ctaLabel: local.ctaLabel, dims: local.dimensionsCm, placement: local.placement === "default" ? settings.arPlacement : local.placement }
    : remote
      ? { name: remote.name, glbUrl: remote.glbUrl, ctaUrl: "", ctaLabel: "", dims: null, placement: "floor" as const }
      : null;

  const viewName = view?.name;
  useEffect(() => {
    if (viewName) document.title = `${viewName} · ${settings.workspaceName}`;
  }, [viewName, settings.workspaceName]);

  const placeOnSurface = () => {
    if (!view) return;
    if (phone === "android") {
      window.location.href = sceneViewerIntent(view.glbUrl, view.name);
      return;
    }
    void viewerRef.current?.activateAR();
  };

  if (!hydrated || (!local && remote === undefined)) return <main className="min-h-dvh bg-slate-50" />;
  if (local?.status === "processing") return <Unavailable title="Almost ready" text="This 3D model is still being prepared. Check back in a few minutes." />;
  if (!view || (local && !live)) return <Unavailable title={local ? "This model isn’t available" : "Model not found"} text={local ? "It has been taken offline by its owner." : "This link may be mistyped, or the model was deleted."} />;

  const dark = settings.viewerBackground === "dark";
  const brand = settings.brandColor;
  const placement = view.placement;
  const dims = view.dims;
  const showPlace = phone === "android" || phone === "ios";

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
        ref={viewerRef}
        src={view.glbUrl}
        alt={`3D model of ${view.name}`}
        className="min-h-0 flex-1"
        ar
        arPlacement={placement}
        arScale={settings.arScale}
        autoRotate={settings.autoRotate}
        cameraControls={settings.cameraControls}
        shadowIntensity={settings.shadowIntensity}
        onLoad={() => setMeshReady(true)}
        onArStart={() => settings.trackScans && track(slug, "arOpen")}
      />

      <footer className={cn("flex flex-wrap items-end justify-between gap-3", embed ? "p-3" : "px-5 pb-5")}>
        <div className="min-w-0">
          <h1 className={cn("truncate font-semibold tracking-tight", embed ? "text-base" : "text-xl")}>{view.name}</h1>
          {showPlace && (
            <p className={cn("mt-1 max-w-xs text-xs", dark ? "text-slate-300" : "text-slate-500")}>
              Point the camera at a table or floor, then tap that surface to set the object down.
            </p>
          )}
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
          {showPlace && (
            <button
              type="button"
              onClick={placeOnSurface}
              disabled={phone === "ios" && !meshReady}
              className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
              style={{ backgroundColor: brand }}
            >
              <ScanLine className="size-4" aria-hidden /> {phone === "ios" && !meshReady ? "Loading camera…" : "Place on this surface"}
            </button>
          )}
          {view.ctaUrl && (
            <a
              href={view.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => settings.trackScans && track(slug, "shopClick")}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              style={{ backgroundColor: brand }}
            >
              {view.ctaLabel || "Shop now"} <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </div>
      </footer>
    </main>
  );
}
