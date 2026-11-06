import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session-token";
import { createCaptureModel, failIfProcessing } from "@/lib/server/models-db";
import { startKiriJob } from "@/lib/server/kiri-sync";
import type { KiriSource } from "@/lib/server/kiri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIMITS = { minImages: 20, maxImages: 300, maxVideoMb: 500, maxImageMb: 20 };

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "size" in value;
}

export async function POST(req: Request) {
  const token = (await cookies()).get("userSession")?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return json({ error: "Sign in to generate a model." }, 401);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (name.length < 2) return json({ error: "Enter a model name (at least 2 characters)." }, 400);

  const files = form.getAll("files").filter(isFile).filter((file) => file.size > 0);
  const videos = files.filter((file) => file.type.startsWith("video/"));
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (videos.length && images.length) return json({ error: "Upload either one video or a set of photos, not both." }, 400);

  let source: KiriSource;
  if (videos.length) {
    if (videos.length > 1) return json({ error: "Upload one video at a time." }, 400);
    if (videos[0].size > LIMITS.maxVideoMb * 1024 * 1024) return json({ error: `Videos can be up to ${LIMITS.maxVideoMb} MB.` }, 400);
    source = { kind: "video", file: videos[0] };
  } else if (images.length) {
    if (images.length < LIMITS.minImages || images.length > LIMITS.maxImages) {
      return json({ error: `Photo scans need ${LIMITS.minImages}–${LIMITS.maxImages} images.` }, 400);
    }
    if (images.some((file) => file.size > LIMITS.maxImageMb * 1024 * 1024)) {
      return json({ error: `Each photo can be up to ${LIMITS.maxImageMb} MB.` }, 400);
    }
    source = { kind: "images", files: images };
  } else {
    return json({ error: "Add an MP4 video or JPG/PNG photos." }, 400);
  }

  const modelId = await createCaptureModel({
    userId: session.userId,
    name,
    sourceKind: source.kind,
    fileCount: source.kind === "video" ? 1 : source.files.length,
  });

  try {
    await startKiriJob(modelId, source);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "KIRI Engine could not start this scan";
    await failIfProcessing(modelId, reason).catch(() => undefined);
    console.error("[capture] KIRI start failed", { modelId, err });
    return json({ error: "KIRI Engine could not start this scan. Check the capture and try again." }, 502);
  }

  return json({ id: modelId, status: "processing" });
}
