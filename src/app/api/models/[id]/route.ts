import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session-token";
import { getOwnedModel } from "@/lib/server/models-db";
import { syncKiriJob } from "@/lib/server/kiri-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("userSession")?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return json({ error: "Sign in to check this model." }, 401);

  const { id } = await params;
  const model = await getOwnedModel(id, session.userId);
  if (!model) return json({ error: "Model not found." }, 404);

  if (model.status === "COMPLETED" && model.glbUrl) return json({ status: "active", glbUrl: model.glbUrl, viewerSlug: model.viewerSlug });
  if (model.status === "FAILED") return json({ status: "failed", failureReason: model.failureReason });
  if (model.status !== "PROCESSING" || !model.engineJobId) return json({ status: "processing" });

  try {
    const result = await syncKiriJob({ id: model.id, engineJobId: model.engineJobId, viewerSlug: model.viewerSlug });
    if (result.status === "completed") {
      const viewerSlug = result.viewerUrl.split("/v/")[1] || null;
      return json({ status: "active", glbUrl: result.glbS3Url, viewerSlug });
    }
    if (result.status === "failed") return json({ status: "failed", failureReason: result.reason });
    return json({ status: "processing" });
  } catch (err) {
    console.error("[model-sync] transient failure", { modelId: id, err });
    return json({ status: "processing" });
  }
}
