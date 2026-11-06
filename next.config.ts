import type { NextConfig } from "next";

/** Firebase web config is meant for the browser. Copy either NEXT_PUBLIC_* or the server names into the client build. */
const firebaseWebEnv: Record<string, string> = {};
for (const [clientName, serverName] of [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", "FIREBASE_API_KEY"],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "FIREBASE_AUTH_DOMAIN"],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID"],
  ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET"],
  ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_MESSAGING_SENDER_ID"],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", "FIREBASE_APP_ID"],
] as const) {
  const value = process.env[clientName] || process.env[serverName];
  if (value) firebaseWebEnv[clientName] = value;
}

const nextConfig: NextConfig = {
  env: firebaseWebEnv,
  serverExternalPackages: ["draco3dgltf", "firebase-admin"],
  experimental: {
    serverActions: { bodySizeLimit: "500mb" },
  },
};

export default nextConfig;
