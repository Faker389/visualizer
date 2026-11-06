import { NextResponse } from "next/server";
import { captureSession, deleteCapture, loadCapture } from "@/lib/server/capture";
import { createCaptureModel, failIfProcessing } from "@/lib/server/models-db";
import { startKiriJob } from "@/lib/server/kiri-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const session = await captureSession();
  if (!session) return json({ error: "Sign in to generate a model." }, 401);

  const body = (await req.json().catch(() => null)) as { name?: unknown; paths?: unknown } | null;
  const name = String(body?.name ?? "").trim().slice(0, 80);
  if (name.length < 2) return json({ error: "Enter a model name (at least 2 characters)." }, 400);
  const paths = Array.isArray(body?.paths) ? body.paths.filter((path): path is string => typeof path === "string") : [];

  let source;
  try {
    source = await loadCapture(session.userId, paths);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "This capture upload is not valid.";
    return json({ error: reason }, 400);
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

  await deleteCapture(paths);
  return json({ id: modelId, status: "processing" });
}
