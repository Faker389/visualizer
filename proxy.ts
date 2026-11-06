// proxy.ts

import { verifySessionToken } from "@/lib/session-token";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("userSession")?.value;

  const session = token
    ? await verifySessionToken(token)
    : null;

  const isAuthenticated = !!session;

  // Homepage redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(
        isAuthenticated ? "/dashboard" : "/login",
        request.url
      )
    );
  }

  // Protect dashboard
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Redirect authenticated users away from login
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};