import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_KEY } from "@/lib/cookies";

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.has(COOKIE_KEY);
  const target = isLoggedIn ? "/dashboard" : "/login";
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  matcher: "/",
};
