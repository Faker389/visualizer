"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Box,
  Camera,
  Check,
  ChevronDown,
  CloudUpload,
  CreditCard,
  FileBox,
  FileVideo,
  Images,
  Lightbulb,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import type { NewModel } from "@/components/models-store";
import { useSettings } from "@/components/settings-store";
import { formatStorage } from "@/lib/billing";
import { cn } from "@/lib/cn";

type Step = 1 | 2 | 3;
type Mode = "capture" | "file";

const tasks = ["Extracting frames", "Reconstructing the mesh", "Optimizing for WebAR"];
const PROCESSING_MS = 7000;

/** KIRI Photo Scan limits; see src/lib/server/kiri.ts. */
const LIMITS = { minImages: 20, maxImages: 300, maxVideoSec: 180, maxVideoPx: 1920, maxVideoMb: 500, maxGlbMb: 150 };

const captureTips = [
  "Use soft, even light. Avoid harsh shadows, reflections and direct sun.",
  "Walk slowly around the object in 2–3 loops at different heights.",
  "Keep the whole object in frame, with each shot overlapping the last by 60–70%.",
  "Put it on a plain, matte surface. Very shiny or transparent objects scan poorly.",
  `Videos: 1–2 minutes, up to 1080p and ${LIMITS.maxVideoSec / 60} minutes.`,
];

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function videoInfo(file: File) {
  return new Promise<{ duration: number; width: number; height: number } | null>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (v: { duration: number; width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => done(null);
    video.src = url;
  });
}

async function isGlb(file: File) {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return String.fromCharCode(...head) === "glTF";
}

/** Returns an error message, or null when the selection is usable. */
async function validate(mode: Mode, files: File[]): Promise<string | null> {
  if (mode === "file") {
    const [file] = files;
    if (files.length !== 1 || !/\.glb$/i.test(file.name)) return "Choose a single .glb file.";
    if (file.size > LIMITS.maxGlbMb * 1024 * 1024) return `3D files can be up to ${LIMITS.maxGlbMb} MB.`;
    if (!(await isGlb(file))) return "This file isn’t a valid binary glTF (.glb).";
    return null;
  }
  const videos = files.filter((f) => f.type.startsWith("video/"));
  const images = files.filter((f) => f.type.startsWith("image/"));
  if (videos.length && images.length) return "Upload either one video or a set of photos, not both.";
  if (videos.length) {
    if (videos.length > 1) return "Upload one video at a time.";
    const [video] = videos;
    if (video.size > LIMITS.maxVideoMb * 1024 * 1024) return `Videos can be up to ${LIMITS.maxVideoMb} MB.`;
    const info = await videoInfo(video);
    if (!info) return "This video can’t be read. Export it as MP4 (H.264) and try again.";
    if (info.duration > LIMITS.maxVideoSec) return `This video is ${Math.round(info.duration)}s long; the limit is ${LIMITS.maxVideoSec / 60} minutes.`;
    if (Math.max(info.width, info.height) > LIMITS.maxVideoPx) return `This video is ${info.width}×${info.height}. Record or export it at 1080p or lower.`;
    return null;
  }
  if (images.length < LIMITS.minImages) return `You selected ${images.length} photo${images.length === 1 ? "" : "s"}; at least ${LIMITS.minImages} are needed for a good model.`;
  if (images.length > LIMITS.maxImages) return `You selected ${images.length} photos; the limit is ${LIMITS.maxImages}.`;
  return null;
}

function StepIndicator({ step, mode }: { step: Step; mode: Mode }) {
  const labels = mode === "capture" ? ["Upload", "Processing", "Ready"] : ["Upload", "Ready"];
  const current = mode === "capture" ? step : step === 3 ? 2 : 1;
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-indigo-600 text-white",
                active && "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600",
                !done && !active && "bg-slate-100 text-slate-400",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={cn("hidden text-sm font-medium sm:inline", active ? "text-slate-900" : "text-slate-400")}>{label}</span>
            {i < labels.length - 1 && <span className={cn("h-px w-6 sm:w-10", done ? "bg-indigo-600" : "bg-slate-200")} />}
          </li>
        );
      })}
    </ol>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-44" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef2ff" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          className="transition-[stroke-dashoffset] duration-200 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ perspective: 400 }}>
        <div className="cube relative size-14">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <span className="mt-5 text-sm font-semibold tabular-nums text-slate-700">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

export function UploadWizard({ onClose, onComplete }: { onClose: () => void; onComplete: (input: NewModel) => void }) {
  const { settings } = useSettings();
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("capture");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(true);
  const [name, setName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paying, setPaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !paying && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, paying]);

  useEffect(() => {
    if (step !== 2) return;
    const start = performance.now();
    const id = setInterval(() => {
      const p = Math.min(100, ((performance.now() - start) / PROCESSING_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => setStep(3), 500);
      }
    }, 100);
    return () => clearInterval(id);
  }, [step]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setFiles([]);
    setError(null);
  };

  const acceptFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list);
    setFiles(picked);
    setChecking(true);
    const problem = await validate(mode, picked);
    setChecking(false);
    setError(problem);
    if (!problem && !name) {
      const base = picked[0].name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      setName(base.charAt(0).toUpperCase() + base.slice(1));
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFiles(e.dataTransfer.files);
  };

  const finish = (status: NewModel["status"]) => {
    const file = files[0];
    onComplete(
      mode === "file"
        ? { name: name.trim(), status, source: "upload", fileSize: formatStorage(file.size / 1024 / 1024), glbUrl: URL.createObjectURL(file) }
        : { name: name.trim(), status, source: "capture" },
    );
  };

  const checkout = () => {
    setPaying(true);
    setTimeout(() => finish("active"), 1400);
  };

  const isVideo = files[0]?.type.startsWith("video/");
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const heavyUpload = mode === "file" && !error && totalSize > settings.maxFileSizeMb * 1024 * 1024;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !paying && onClose()} aria-hidden />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-fade-up relative flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <StepIndicator step={step} mode={mode} />
          <button
            onClick={onClose}
            disabled={paying}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 sm:p-8">
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 id={titleId} className="text-xl font-semibold tracking-tight">
                Create a new 3D model
              </h2>

              <div role="radiogroup" aria-label="Source" className="mt-4 grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "capture", icon: Camera, title: "Scan a product", text: "Video or photos · uses 1 credit" },
                    { value: "file", icon: FileBox, title: "Upload a 3D file", text: "Existing .glb · no credit" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={mode === o.value}
                    onClick={() => switchMode(o.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      mode === o.value ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <o.icon className={cn("mt-0.5 size-5 shrink-0", mode === o.value ? "text-indigo-600" : "text-slate-400")} aria-hidden />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{o.title}</span>
                      <span className="block text-xs text-slate-500">{o.text}</span>
                    </span>
                  </button>
                ))}
              </div>

              {mode === "capture" && (
                <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/60">
                  <button
                    type="button"
                    onClick={() => setTipsOpen((o) => !o)}
                    aria-expanded={tipsOpen}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-amber-900"
                  >
                    <span className="flex items-center gap-2">
                      <Lightbulb className="size-4" aria-hidden /> How to capture a good scan
                    </span>
                    <ChevronDown className={cn("size-4 transition-transform", tipsOpen && "rotate-180")} aria-hidden />
                  </button>
                  {tipsOpen && (
                    <ul className="space-y-1.5 px-4 pb-3 text-sm text-amber-900/80">
                      {captureTips.map((t) => (
                        <li key={t} className="flex gap-2">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-amber-600" strokeWidth={3} aria-hidden /> {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/40",
                )}
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                  <CloudUpload className="size-6" aria-hidden />
                </div>
                <p className="mt-3 max-w-xs text-sm text-slate-600">
                  <span className="font-semibold text-indigo-600">Drag and drop</span>{" "}
                  {mode === "capture" ? "a video or a batch of photos" : "your .glb file"} here, or <span className="font-semibold text-indigo-600">click to browse</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {mode === "capture"
                    ? `MP4 up to ${LIMITS.maxVideoMb} MB, 1080p, ${LIMITS.maxVideoSec / 60} min · or ${LIMITS.minImages}–${LIMITS.maxImages} JPG/PNG photos`
                    : `.glb up to ${LIMITS.maxGlbMb} MB · the iPhone version (USDZ) is created automatically`}
                </p>
              </button>
              <input
                key={mode}
                ref={inputRef}
                type="file"
                accept={mode === "capture" ? "video/mp4,video/quicktime,image/*" : ".glb,model/gltf-binary"}
                multiple={mode === "capture"}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => acceptFiles(e.target.files)}
              />

              {files.length > 0 && (
                <div className={cn("mt-3 flex items-center gap-3 rounded-xl border bg-white p-3", error ? "border-rose-200" : "border-slate-200")}>
                  <div className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                    {mode === "file" ? <FileBox className="size-5" /> : isVideo ? <FileVideo className="size-5" /> : <Images className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{files.length === 1 ? files[0].name : `${files.length} photos selected`}</p>
                    <p className="text-xs text-slate-500">{checking ? "Checking…" : formatBytes(totalSize)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFiles([]);
                      setError(null);
                    }}
                    aria-label="Remove files"
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              {error && (
                <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-rose-600">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
                </p>
              )}
              {heavyUpload && (
                <p className="mt-2 flex items-start gap-2 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  This file is over {settings.maxFileSizeMb} MB. We’ll compress it, but very detailed models can still load slowly on phones.
                </p>
              )}

              <form
                className="mt-6 space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep(mode === "capture" ? 2 : 3);
                }}
              >
                <Input id="model-name" label="Model Name" placeholder="e.g. Running Sneaker" value={name} onChange={(e) => setName(e.target.value)} required />
                <div className="flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!files.length || !!error || checking || !name.trim()}>
                    {mode === "capture" ? "Generate 3D model" : "Upload"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-up flex flex-col items-center text-center" aria-live="polite">
              <ProgressRing value={progress} />
              <h2 id={titleId} className="mt-6 text-xl font-semibold tracking-tight">
                Generating your 3D mesh…
              </h2>
              <p className="mt-1 text-sm text-slate-500">This usually takes 2–3 minutes. You can close this window; we’ll notify you.</p>
              <ul className="mt-8 w-full max-w-xs space-y-3 text-left">
                {tasks.map((task, i) => {
                  const threshold = ((i + 1) / tasks.length) * 100;
                  const done = progress >= threshold;
                  const active = !done && progress >= (i / tasks.length) * 100;
                  return (
                    <li key={task} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full transition-all duration-300",
                          done ? "scale-100 bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {done ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : active ? (
                          <LoaderCircle className="size-3.5 animate-spin text-indigo-600" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-slate-300" />
                        )}
                      </span>
                      <span className={cn("text-sm transition-colors", done ? "font-medium text-slate-900" : active ? "text-slate-700" : "text-slate-400")}>{task}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-up text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
                <Check className="size-7" strokeWidth={3} aria-hidden />
              </div>
              <h2 id={titleId} className="mt-5 text-xl font-semibold tracking-tight">
                {name} is ready
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "capture" ? "Your 3D model was generated successfully." : "Your 3D file was checked and optimized for WebAR."}
              </p>

              <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-slate-100 to-violet-100">
                <div className="absolute inset-0 grid place-items-center blur-[6px]">
                  <Box className="size-36 text-indigo-500/80" strokeWidth={1.5} />
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
                    <Lock className="size-3.5" aria-hidden /> Preview locked
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-left">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden />
                <p className="text-sm text-indigo-900">
                  <span className="font-semibold">Your model is ready!</span> Pay to unlock AR hosting and download your QR code.
                </p>
              </div>

              <Button size="lg" className="mt-6 w-full" onClick={checkout} disabled={paying}>
                {paying ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
                {paying ? "Redirecting to Stripe…" : "Checkout with Stripe ($4.99)"}
              </Button>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden /> Secure payment
                </span>
                <button
                  onClick={() => finish("draft")}
                  disabled={paying}
                  className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  Save as draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
