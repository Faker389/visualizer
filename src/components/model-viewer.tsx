"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { Box, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  alt: string;
  className?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
  shadowIntensity?: number;
  ar?: boolean;
  arPlacement?: "floor" | "wall";
  arScale?: "auto" | "fixed";
  lazy?: boolean;
  /** Rendered in model-viewer's `ar-button` slot; only visible on devices that support AR. */
  arButton?: ReactNode;
  onArStart?: () => void;
  onLoad?: () => void;
};

export type ModelViewerHandle = { activateAR: () => Promise<void> };

export const ModelViewer = forwardRef<ModelViewerHandle, Props>(function ModelViewer({
  src,
  alt,
  className,
  autoRotate = true,
  cameraControls = true,
  shadowIntensity = 1,
  ar = false,
  arPlacement = "floor",
  arScale = "auto",
  lazy = false,
  arButton,
  onArStart,
  onLoad,
}: Props, handle) {
  const ref = useRef<HTMLElement>(null);
  const [libReady, setLibReady] = useState(false);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const onArStartRef = useRef(onArStart);
  const onLoadRef = useRef(onLoad);

  useImperativeHandle(handle, () => ({
    activateAR: async () => {
      const el = ref.current as (HTMLElement & { activateAR?: () => Promise<void> }) | null;
      if (!el?.activateAR) throw new Error("AR is not available on this device.");
      await el.activateAR();
    },
  }));

  useEffect(() => {
    onArStartRef.current = onArStart;
    onLoadRef.current = onLoad;
  }, [onArStart, onLoad]);

  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer").then(() => !cancelled && setLibReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setState("loading"), [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoad = () => {
      setState("loaded");
      onLoadRef.current?.();
    };
    const onError = () => setState("error");
    const onAr = (e: Event) => {
      if ((e as CustomEvent<{ status: string }>).detail?.status === "session-started") onArStartRef.current?.();
    };
    const alreadyLoaded = (el as HTMLElement & { loaded?: boolean }).loaded;
    if (alreadyLoaded) onLoad();
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    el.addEventListener("ar-status", onAr);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
      el.removeEventListener("ar-status", onAr);
    };
  }, [libReady]);

  return (
    <div className={cn("relative", className)}>
      {libReady && (
        <model-viewer
          ref={ref}
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "auto"}
          ar={ar || undefined}
          ar-modes="webxr scene-viewer quick-look"
          ar-placement={arPlacement}
          ar-scale={arScale}
          camera-controls={cameraControls || undefined}
          auto-rotate={autoRotate || undefined}
          interaction-prompt={cameraControls ? "auto" : "none"}
          shadow-intensity={shadowIntensity}
          style={{ width: "100%", height: "100%", backgroundColor: "transparent", ["--poster-color" as string]: "transparent" }}
        >
          <div slot="progress-bar" />
          {ar && arButton}
        </model-viewer>
      )}
      {state !== "loaded" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {state === "error" ? (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-slate-500">
              <Box className="size-10 text-slate-300" strokeWidth={1.25} aria-hidden />
              Couldn’t load the 3D file
            </div>
          ) : (
            <LoaderCircle className="size-7 animate-spin text-indigo-400" aria-label="Loading 3D model" />
          )}
        </div>
      )}
    </div>
  );
});
