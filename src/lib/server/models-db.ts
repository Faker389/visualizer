import "server-only";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { db } from "@/lib/server/db";

export class SlugTakenError extends Error {
  constructor() {
    super("viewer slug already in use");
    this.name = "SlugTakenError";
  }
}

export type ModelStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export type ModelJob = {
  id: string;
  status: ModelStatus;
  viewerSlug: string | null;
  engineJobId: string;
};

const models = () => db().collection("models");

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
}

function toJob(id: string, data: DocumentData): ModelJob | null {
  if (typeof data.engineJobId !== "string" || !data.engineJobId) return null;
  return {
    id,
    status: data.status as ModelStatus,
    viewerSlug: typeof data.viewerSlug === "string" ? data.viewerSlug : null,
    engineJobId: data.engineJobId,
  };
}

export async function findModelByEngineJob(engineJobId: string): Promise<ModelJob | null> {
  const snap = await models().where("engineJobId", "==", engineJobId).limit(1).get();
  const doc = snap.docs[0];
  return doc ? toJob(doc.id, doc.data()) : null;
}

export async function setEngineJobId(modelId: string, engineJobId: string) {
  await models().doc(modelId).update({ engineJobId });
}

/**
 * Flips PROCESSING → COMPLETED once. A second delivery finds the model already moved and returns false.
 * Throws SlugTakenError when another model already owns the viewer slug.
 */
export async function completeIfProcessing(
  modelId: string,
  data: { glbS3Url: string; usdzS3Url: string | null; glbSizeBytes: number; viewerSlug: string },
): Promise<boolean> {
  const ref = models().doc(modelId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("status") !== "PROCESSING") return false;

    const clash = await tx.get(models().where("viewerSlug", "==", data.viewerSlug).limit(1));
    if (clash.docs.some((doc) => doc.id !== modelId)) throw new SlugTakenError();

    tx.update(ref, {
      status: "COMPLETED",
      glbS3Url: data.glbS3Url,
      usdzS3Url: data.usdzS3Url,
      glbSizeBytes: data.glbSizeBytes,
      viewerSlug: data.viewerSlug,
      completedAt: new Date(),
      failureReason: null,
    });
    return true;
  });
}

export async function failIfProcessing(modelId: string, reason: string) {
  const ref = models().doc(modelId);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("status") !== "PROCESSING") return;
    tx.update(ref, { status: "FAILED", failureReason: reason.slice(0, 1000) });
  });
}

/** PROCESSING jobs that already have a KIRI id and were created before `olderThan`. */
export async function listStaleProcessing(olderThan: Date, limit: number): Promise<ModelJob[]> {
  const snap = await models().where("status", "==", "PROCESSING").orderBy("createdAt", "asc").limit(50).get();
  const jobs: ModelJob[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const job = toJob(doc.id, data);
    if (!job || toDate(data.createdAt) >= olderThan) continue;
    jobs.push(job);
    if (jobs.length === limit) break;
  }
  return jobs;
}

/** Creates users/{uid} on first sign-in. Later sign-ins only refresh email and name. */
export async function upsertUser(uid: string, profile: { email: string; name: string; provider: string }) {
  const ref = db().collection("users").doc(uid);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        email: profile.email,
        name: profile.name,
        provider: profile.provider,
        tier: "FREE",
        creditsRemaining: 0,
        stripeCustomerId: null,
        createdAt: FieldValue.serverTimestamp(),
        lastSignInAt: FieldValue.serverTimestamp(),
      });
      return;
    }
    tx.set(ref, { email: profile.email, lastSignInAt: FieldValue.serverTimestamp(), ...(profile.name ? { name: profile.name } : {}) }, { merge: true });
  });
}
