"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOptionalActivity } from "@/components/activity-store";
import { FALLBACK_GLB, models as seed, type ArModel, type ModelStatus } from "@/lib/models";

export type NewModel = { name: string; status: ModelStatus; source: ArModel["source"]; fileSize?: string; glbUrl?: string; id?: string; remote?: boolean };
export type ViewerEvent = "scan" | "arOpen" | "shopClick";

type Store = {
  models: ArModel[];
  /** False until models saved in this browser have been loaded. */
  hydrated: boolean;
  addModel: (input: NewModel) => ArModel;
  removeModel: (id: string) => void;
  updateModel: (id: string, patch: Partial<ArModel>) => void;
  retryModel: (id: string) => void;
  track: (slug: string, event: ViewerEvent) => void;
};

const STORAGE_KEY = "arcade3d.models.v2";
const PROCESSING_MS = 12_000;

const ModelsContext = createContext<Store | null>(null);

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "model";

const defaults: Omit<ArModel, "id" | "name" | "status" | "createdAt" | "fileSize" | "polygons" | "slug"> = {
  scans: 0,
  arOpens: 0,
  shopClicks: 0,
  avgSessionSec: 0,
  glbUrl: FALLBACK_GLB,
  source: "capture",
  tags: [],
  ctaLabel: "",
  ctaUrl: "",
  placement: "default",
  dimensionsCm: null,
};

/** Fills fields added since the data was stored; blob: URLs from uploads don't survive a reload. */
const normalize = (m: ArModel): ArModel => ({
  ...defaults,
  ...m,
  glbUrl: m.glbUrl?.startsWith("blob:") ? FALLBACK_GLB : (m.glbUrl ?? FALLBACK_GLB),
});

const counter: Record<ViewerEvent, "scans" | "arOpens" | "shopClicks"> = { scan: "scans", arOpen: "arOpens", shopClick: "shopClicks" };

function readStored(): ArModel[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ArModel[]).map(normalize) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<ArModel[]>(seed);
  const [hydrated, setHydrated] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activity = useOptionalActivity();
  const notifyRef = useRef(activity?.notify);
  useEffect(() => {
    notifyRef.current = activity?.notify;
  }, [activity?.notify]);

  useEffect(() => {
    const stored = readStored();
    if (stored) setModels(stored);
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = readStored();
      if (next) setModels(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  }, [models, hydrated]);

  const remoteKey = models.filter((m) => m.remote).map((m) => `${m.id}:${m.status}`).join(",");

  useEffect(() => {
    if (!hydrated || !remoteKey) return;
    let cancelled = false;
    const entries = remoteKey.split(",").map((part) => {
      const [id, status] = part.split(":");
      return { id, status };
    });

    const tick = async (onlyProcessing: boolean) => {
      for (const entry of entries) {
        if (onlyProcessing && entry.status !== "processing") continue;
        const res = await fetch(`/api/models/${entry.id}`).catch(() => null);
        if (!res?.ok || cancelled) continue;
        const data = (await res.json()) as { status?: string; glbUrl?: string; viewerSlug?: string | null; failureReason?: string };
        if (data.status === "active" && data.glbUrl) {
          const name = models.find((m) => m.id === entry.id)?.name ?? "Model";
          setModels((prev) =>
            prev.map((m) => {
              if (m.id !== entry.id) return m;
              const slug = data.viewerSlug || m.slug;
              if (m.status === "active" && m.glbUrl === data.glbUrl && m.slug === slug) return m;
              return { ...m, status: m.status === "failed" ? m.status : "active", glbUrl: data.glbUrl!, slug };
            }),
          );
          if (entry.status === "processing") {
            notifyRef.current?.({ kind: "success", title: `${name} is ready`, body: "KIRI finished the mesh. Its QR code now opens the model in AR.", href: `/models/${entry.id}` });
          }
        } else if (data.status === "failed" && entry.status === "processing") {
          setModels((prev) => prev.map((m) => (m.id === entry.id && m.status === "processing" ? { ...m, status: "failed", failureReason: data.failureReason } : m)));
        }
      }
    };

    void tick(false);
    if (!entries.some((entry) => entry.status === "processing")) return;
    const timer = setInterval(() => void tick(true), 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `models` is read only to name the notification. `remoteKey` decides when to poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, remoteKey]);

  // Stand-in for the engine webhook: processing models finish after a short delay.
  useEffect(() => {
    if (!hydrated) return;
    for (const m of models) {
      if (m.status !== "processing" || m.remote || timers.current.has(m.id)) continue;
      timers.current.set(
        m.id,
        setTimeout(() => {
          timers.current.delete(m.id);
          setModels((prev) => prev.map((x) => (x.id === m.id && x.status === "processing" ? { ...x, status: "active" } : x)));
          notifyRef.current?.({ kind: "success", title: `${m.name} is live`, body: "Generation finished. Its QR code and link are ready.", href: `/models/${m.id}` });
        }, PROCESSING_MS),
      );
    }
  }, [models, hydrated]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const addModel = useCallback((input: NewModel) => {
    const model: ArModel = {
      ...defaults,
      id: input.id ?? `${slugify(input.name)}-${Date.now().toString(36)}`,
      remote: input.remote,
      name: input.name,
      status: input.status,
      source: input.source,
      createdAt: new Date().toISOString().slice(0, 10),
      fileSize: input.fileSize ?? `${(1 + Math.random() * 5).toFixed(1)} MB`,
      polygons: `${Math.round(10 + Math.random() * 60)}k`,
      slug: Math.random().toString(36).slice(2, 7),
      glbUrl: input.glbUrl ?? FALLBACK_GLB,
    };
    setModels((prev) => [model, ...prev]);
    return model;
  }, []);

  const removeModel = useCallback((id: string) => setModels((prev) => prev.filter((m) => m.id !== id)), []);

  const updateModel = useCallback(
    (id: string, patch: Partial<ArModel>) => setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    [],
  );

  const retryModel = useCallback(
    (id: string) => setModels((prev) => prev.map((m) => (m.id === id ? { ...m, status: "processing", failureReason: undefined } : m))),
    [],
  );

  const track = useCallback((slug: string, event: ViewerEvent) => {
    const key = counter[event];
    setModels((prev) => prev.map((m) => (m.slug === slug ? { ...m, [key]: m[key] + 1 } : m)));
  }, []);

  const value = useMemo(
    () => ({ models, hydrated, addModel, removeModel, updateModel, retryModel, track }),
    [models, hydrated, addModel, removeModel, updateModel, retryModel, track],
  );
  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
}

export function useModels() {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error("useModels must be used within ModelsProvider");
  return ctx;
}
