import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function firebasePrivateKey() {
  let value = process.env.FIREBASE_PRIVATE_KEY?.trim() ?? "";
  if (value.endsWith(",")) value = value.slice(0, -1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.replace(/\\n/g, "\n");
}

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = firebasePrivateKey();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function db(): Firestore {
  return getFirestore(adminApp());
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function modelBucket() {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
  if (!name) throw new Error("Firebase Storage bucket is not configured.");
  return getStorage(adminApp()).bucket(name);
}
