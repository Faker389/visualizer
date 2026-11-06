"use server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  verifySessionToken,
} from "./session-token";

const COOKIE_KEY = "userSession";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export async function createSession(userId: string) {
  const token = await createSessionToken(userId);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_KEY, token, COOKIE_OPTIONS);
}

export async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_KEY)?.value;

  if (!token) return null;

  return verifySessionToken(token);
}

export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_KEY);
}