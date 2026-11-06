import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { modelBucket } from "@/lib/server/db";
import { env } from "@/lib/server/env";

let client: S3Client | undefined;

function s3() {
  const e = env();
  return (client ??= new S3Client({
    region: e.S3_REGION,
    endpoint: e.S3_ENDPOINT,
    forcePathStyle: e.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
  }));
}

function s3Ready() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

async function uploadToFirebase(key: string, body: Uint8Array, contentType: string) {
  const bucket = modelBucket();
  const token = randomUUID();
  await bucket.file(key).save(Buffer.from(body), {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(key)}?alt=media&token=${token}`;
}

/** Uploads under a content-addressed key. Uses S3/R2 when those keys are set, otherwise Firebase Storage. */
export async function uploadModelAsset(modelId: string, ext: "glb" | "usdz", body: Uint8Array, contentType: string) {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const key = `models/${modelId}/${hash}.${ext}`;
  if (!s3Ready()) return uploadToFirebase(key, body, contentType);
  await s3().send(
    new PutObjectCommand({
      Bucket: env().S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${env().ASSET_CDN_BASE_URL}/${key}`;
}
