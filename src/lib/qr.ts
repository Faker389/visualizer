import QRCode from "qrcode";
import { zipSync } from "fflate";

export type QrStyle = { color: string; errorCorrectionLevel: "L" | "M" | "Q" | "H" };

export const qrSvg = (url: string, { color, errorCorrectionLevel }: QrStyle) =>
  QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel, color: { dark: color, light: "#ffffff" } });

export const qrPngDataUrl = (url: string, { color, errorCorrectionLevel }: QrStyle) =>
  QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel, color: { dark: color, light: "#ffffff" } });

export function downloadHref(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  downloadHref(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileSafe = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "model";

/** One 1024px PNG per entry, zipped. Duplicate names get a numeric suffix. */
export async function qrZip(entries: { name: string; url: string }[], style: QrStyle) {
  const files: Record<string, Uint8Array> = {};
  for (const { name, url } of entries) {
    const dataUrl = await qrPngDataUrl(url, style);
    const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
    let file = `${fileSafe(name)}-qr.png`;
    for (let i = 2; files[file]; i++) file = `${fileSafe(name)}-${i}-qr.png`;
    files[file] = bytes;
  }
  return new Blob([zipSync(files, { level: 0 })], { type: "application/zip" });
}
