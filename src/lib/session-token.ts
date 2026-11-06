// lib/session-token.ts

import { SignJWT, jwtVerify } from "jose";

const secret = process.env.SESSION_SECRET;

if (!secret) {
  throw new Error("SESSION_SECRET is not configured");
}

const key = new TextEncoder().encode(secret);

export async function createSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("your-app")
    .setAudience("your-app-users")
    .sign(key);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: "your-app",
      audience: "your-app-users",
    });

    if (!payload.sub) return null;

    return {
      userId: payload.sub,
    };
  } catch {
    return null;
  }
}
