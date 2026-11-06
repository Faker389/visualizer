import { NextResponse } from "next/server";
import { findPublicModel } from "@/lib/server/models-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = await findPublicModel(slug);
  if (!model) return NextResponse.json({ error: "Model not found." }, { status: 404 });
  return NextResponse.json(model, { headers: { "Cache-Control": "no-store" } });
}
