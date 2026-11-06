import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

function loadEnv(path) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.endsWith(",")) value = value.slice(0, -1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
}

loadEnv(new URL("../.env.local", import.meta.url));

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
if (!projectId || !clientEmail || !privateKey || !bucketName) {
  throw new Error("Missing Firebase admin or storage bucket settings.");
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

const bucket = getStorage().bucket(bucketName);
await bucket.setCorsConfiguration([
  {
    origin: ["*"],
    method: ["GET", "HEAD", "PUT"],
    responseHeader: ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"],
    maxAgeSeconds: 3600,
  },
]);

const [metadata] = await bucket.getMetadata();
console.log(`CORS updated on ${bucketName}`);
console.log(JSON.stringify(metadata.cors ?? [], null, 2));
