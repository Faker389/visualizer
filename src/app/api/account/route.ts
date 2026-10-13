import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/server/db";
import { upsertUser } from "@/lib/server/models-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verifies the Firebase ID token and creates the Firestore user profile on first sign-in. */
export async function POST(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  let email: string;
  let provider: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? "";
    provider = decoded.firebase.sign_in_provider;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("not configured")) return NextResponse.json({ error: message }, { status: 503 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";

  try {
    await upsertUser(uid, { email, name, provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save your account.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not save your account." }, { status });
  }

  return NextResponse.json({ ok: true });
}
