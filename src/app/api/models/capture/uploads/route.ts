import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  try {
    const { captureSession, signedCaptureUploads } = await import("@/lib/server/capture");
    const session = await captureSession();
    if (!session) return json({ error: "Sign in to generate a model." }, 401);

    const body = (await req.json().catch(() => null)) as { name?: unknown; files?: unknown } | null;
    const name = String(body?.name ?? "").trim().slice(0, 80);
    if (name.length < 2) return json({ error: "Enter a model name (at least 2 characters)." }, 400);

    const files = Array.isArray(body?.files)
      ? body.files.flatMap((file) => {
          if (!file || typeof file !== "object") return [];
          const type = "type" in file ? String(file.type ?? "") : "";
          const size = "size" in file ? Number(file.size) : NaN;
          return [{ type, size }];
        })
      : [];

    const plan = await signedCaptureUploads(session.userId, files);
    if (!plan.ok) return json({ error: plan.error }, 400);
    return json({ uploads: plan.uploads });
  } catch (err) {
    console.error("[capture] could not prepare upload", err);
    const message = err instanceof Error ? err.message : "Could not prepare the upload.";
    return json({ error: message }, 500);
  }
}
