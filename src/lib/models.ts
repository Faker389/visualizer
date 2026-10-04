/**
 * - processing: the 3D engine is generating the mesh
 * - failed: generation failed (see `failureReason`); retrying is free
 * - draft: generated but AR hosting not paid for yet
 * - active: live — link and QR code work
 * - unpublished: paid, but taken offline by the owner; doesn't use a live-model slot
 */
export type ModelStatus = "processing" | "failed" | "draft" | "active" | "unpublished";

export type Placement = "default" | "floor" | "wall";

export type ArModel = {
  id: string;
  name: string;
  status: ModelStatus;
  scans: number;
  arOpens: number;
  shopClicks: number;
  avgSessionSec: number;
  createdAt: string;
  fileSize: string;
  polygons: string;
  slug: string;
  glbUrl: string;
  thumbnailUrl?: string;
  source: "capture" | "upload";
  tags: string[];
  failureReason?: string;
  ctaLabel: string;
  ctaUrl: string;
  placement: Placement;
  dimensionsCm: { w: number; h: number; d: number } | null;
};

const SAMPLE_ASSETS = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models";
export const sampleGlb = (name: string) => `${SAMPLE_ASSETS}/${name}/glTF-Binary/${name}.glb`;

const today = new Date().toISOString().slice(0, 10);

type Seed = Pick<ArModel, "id" | "name" | "status" | "scans" | "createdAt" | "fileSize" | "polygons" | "slug" | "tags"> &
  Partial<ArModel> & { asset: string };

const seeds: Seed[] = [
  { id: "running-sneaker", name: "Running Sneaker", status: "active", scans: 3412, createdAt: "2026-08-14", fileSize: "7.5 MB", polygons: "48k", slug: "k7x2p", asset: "MaterialsVariantsShoe", tags: ["Footwear"], ctaLabel: "Shop now", ctaUrl: "https://example.com/products/running-sneaker", dimensionsCm: { w: 11, h: 12, d: 29 } },
  { id: "water-bottle", name: "Water Bottle", status: "active", scans: 1288, createdAt: "2026-08-21", fileSize: "8.6 MB", polygons: "12k", slug: "m3ug9", asset: "WaterBottle", tags: ["Kitchen"], ctaLabel: "Buy now", ctaUrl: "https://example.com/products/water-bottle" },
  { id: "desk-lamp", name: "Desk Lamp", status: "draft", scans: 0, createdAt: "2026-09-02", fileSize: "3.9 MB", polygons: "31k", slug: "l4mp1", asset: "IridescenceLamp", tags: ["Lighting"] },
  { id: "velvet-sofa", name: "Velvet Sofa", status: "active", scans: 2764, createdAt: "2026-09-05", fileSize: "3.0 MB", polygons: "62k", slug: "b4g7q", asset: "GlamVelvetSofa", tags: ["Furniture"], ctaLabel: "View sofa", ctaUrl: "https://example.com/products/velvet-sofa", placement: "floor", dimensionsCm: { w: 210, h: 85, d: 95 } },
  { id: "chronograph-watch", name: "Chronograph Watch", status: "unpublished", scans: 947, createdAt: "2026-09-11", fileSize: "7.1 MB", polygons: "22k", slug: "v4s3z", asset: "ChronographWatch", tags: ["Accessories"] },
  { id: "retro-speaker", name: "Retro Speaker", status: "draft", scans: 0, createdAt: "2026-09-18", fileSize: "10.1 MB", polygons: "41k", slug: "h3dp8", asset: "BoomBox", tags: ["Electronics"] },
  { id: "sunglasses", name: "Aviator Sunglasses", status: "active", scans: 1603, createdAt: "2026-09-22", fileSize: "0.4 MB", polygons: "9k", slug: "s9ngl", asset: "SunglassesKhronos", tags: ["Accessories"], ctaLabel: "Shop now", ctaUrl: "https://example.com/products/aviators" },
  { id: "armchair", name: "Velvet Armchair", status: "active", scans: 2466, createdAt: "2026-09-27", fileSize: "3.9 MB", polygons: "85k", slug: "ch41r", asset: "SheenChair", tags: ["Furniture"], ctaLabel: "Buy now", ctaUrl: "https://example.com/products/armchair", placement: "floor", dimensionsCm: { w: 70, h: 80, d: 75 } },
  { id: "vintage-lantern", name: "Vintage Lantern", status: "processing", scans: 0, createdAt: today, fileSize: "9.1 MB", polygons: "28k", slug: "lt9n2", asset: "Lantern", tags: ["Lighting"] },
  { id: "toy-car", name: "Toy Race Car", status: "failed", scans: 0, createdAt: today, fileSize: "5.2 MB", polygons: "36k", slug: "tc4r7", asset: "ToyCar", tags: ["Toys"], failureReason: "Not enough overlap between photos, so frames couldn't be matched. Retake with each shot overlapping the previous one by 60–70%." },
];

/** Deterministic pseudo-random rate in [min, max) per model, so mock metrics are stable between renders. */
function rate(seed: string, min: number, max: number) {
  let h = 7;
  for (const c of seed) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return min + ((h % 1000) / 1000) * (max - min);
}

export const models: ArModel[] = seeds.map(({ asset, ...s }) => ({
  arOpens: Math.round(s.scans * rate(s.id, 0.45, 0.75)),
  shopClicks: Math.round(s.scans * rate(`${s.id}-cta`, 0.04, 0.12)),
  avgSessionSec: Math.round(rate(`${s.id}-t`, 35, 95)),
  glbUrl: sampleGlb(asset),
  thumbnailUrl: `${SAMPLE_ASSETS}/${asset}/screenshot/screenshot.jpg`,
  source: "capture",
  ctaLabel: "",
  ctaUrl: "",
  placement: "default",
  dimensionsCm: null,
  ...s,
}));

export const FALLBACK_GLB = sampleGlb("SheenChair");

export const isLive = (m: ArModel) => m.status === "active";

export const statusMeta: Record<ModelStatus, { label: string; tone: "emerald" | "amber" | "indigo" | "rose" | "slate" }> = {
  active: { label: "Live", tone: "emerald" },
  draft: { label: "Draft / Unpaid", tone: "amber" },
  processing: { label: "Processing", tone: "indigo" },
  failed: { label: "Failed", tone: "rose" },
  unpublished: { label: "Unpublished", tone: "slate" },
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const viewerPath = (slug: string) => `/v/${slug}`;
export const shortUrl = (slug: string, domain: string) => `${domain}${viewerPath(slug)}`;

export const deviceSplit = [
  { label: "iOS", share: 0.58 },
  { label: "Android", share: 0.37 },
  { label: "Other", share: 0.05 },
];

export const countrySplit = [
  { code: "US", label: "United States", share: 0.34 },
  { code: "GB", label: "United Kingdom", share: 0.14 },
  { code: "DE", label: "Germany", share: 0.11 },
  { code: "PL", label: "Poland", share: 0.09 },
  { code: "FR", label: "France", share: 0.08 },
  { code: "CA", label: "Canada", share: 0.06 },
];

/** Relative scan volume per hour of day (0–23): lunchtime bump and an evening peak. */
export const scanHourProfile = Array.from(
  { length: 24 },
  (_, h) => 0.15 + 0.6 * Math.exp(-((h - 13) ** 2) / 8) + Math.exp(-((h - 20) ** 2) / 10),
);

export function scanSeries(seed: string, days = 30) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return Array.from({ length: days }, (_, i) => Math.round(20 + i * 2.2 + rand() * 40 + Math.sin(i / 3) * 10));
}

export const SCAN_HISTORY_DAYS = 180;

/** Mock daily scans ending today, scaled so the full history adds up to the model's all-time scan count. */
export function dailyScans(model: ArModel) {
  if (!model.scans) return Array<number>(SCAN_HISTORY_DAYS).fill(0);
  const raw = scanSeries(model.id, SCAN_HISTORY_DAYS);
  const k = model.scans / raw.reduce((s, v) => s + v, 0);
  return raw.map((v) => Math.round(v * k));
}
