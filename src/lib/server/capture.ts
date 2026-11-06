import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session-token";
import { modelBucket } from "@/lib/server/db";
import type { KiriSource } from "@/lib/server/kiri";

const LIMITS = { minImages: 20, maxImages: 300, maxVideoMb: 500, maxImageMb: 20 };

export async function captureSession() {
  const token = (await cookies()).get("userSession")?.value;
  return token ? verifySessionToken(token) : null;
}

type FileMeta = { type: string; size: number };

export function describeCapture(files: FileMeta[]) {
  if (!files.length || files.some((file) => !Number.isFinite(file.size) || file.size <= 0)) {
    return { ok: false as const, error: "Add an MP4 video or JPG/PNG photos." };
  }
  const videos = files.filter((file) => file.type.startsWith("video/"));
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (videos.length && images.length) return { ok: false as const, error: "Upload either one video or a set of photos, not both." };
  if (videos.length) {
    if (files.length > 1) return { ok: false as const, error: "Upload one video at a time." };
    if (videos[0].size > LIMITS.maxVideoMb * 1024 * 1024) return { ok: false as const, error: `Videos can be up to ${LIMITS.maxVideoMb} MB.` };
    return { ok: true as const, kind: "video" as const, contentTypes: [videos[0].type || "video/mp4"] };
  }
  if (images.length !== files.length) return { ok: false as const, error: "Add an MP4 video or JPG/PNG photos." };
  if (images.length < LIMITS.minImages || images.length > LIMITS.maxImages) {
    return { ok: false as const, error: `Photo scans need ${LIMITS.minImages}–${LIMITS.maxImages} images.` };
  }
  if (images.some((file) => file.size > LIMITS.maxImageMb * 1024 * 1024)) {
    return { ok: false as const, error: `Each photo can be up to ${LIMITS.maxImageMb} MB.` };
  }
  return { ok: true as const, kind: "images" as const, contentTypes: images.map((file) => (file.type.startsWith("image/") ? file.type : "image/jpeg")) };
}

/** Signed write URLs so the browser can store the capture without sending it through Vercel. */
export async function signedCaptureUploads(userId: string, files: FileMeta[]) {
  const described = describeCapture(files);
  if (!described.ok) return described;
  const uploadId = randomUUID();
  const bucket = modelBucket();
  const uploads = await Promise.all(
    described.contentTypes.map(async (contentType, index) => {
      const filename = described.kind === "video" ? "capture.mp4" : `frame-${String(index).padStart(3, "0")}.jpg`;
      const path = `captures/${userId}/${uploadId}/${filename}`;
      const [url] = await bucket.file(path).getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 20 * 60 * 1000,
        contentType,
      });
      return { url, path, contentType };
    }),
  );
  return { ok: true as const, uploads };
}

function ownedCapturePath(userId: string, path: string) {
  return path.startsWith(`captures/${userId}/`) && !path.includes("..") && !path.includes("\\");
}

export async function loadCapture(userId: string, paths: string[]): Promise<KiriSource> {
  if (!paths.length || paths.some((path) => !ownedCapturePath(userId, path))) {
    throw new Error("This capture upload is not valid.");
  }
  const bucket = modelBucket();
  const blobs = await Promise.all(
    paths.map(async (path) => {
      const [bytes] = await bucket.file(path).download();
      const type = path.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
      return new Blob([new Uint8Array(bytes)], { type });
    }),
  );
  if (paths.length === 1 && paths[0].endsWith(".mp4")) return { kind: "video", file: blobs[0] };
  return { kind: "images", files: blobs };
}

export async function deleteCapture(paths: string[]) {
  const bucket = modelBucket();
  await Promise.all(paths.map((path) => bucket.file(path).delete({ ignoreNotFound: true }).catch(() => undefined)));
}
