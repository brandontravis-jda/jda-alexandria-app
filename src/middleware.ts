import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow: auth routes, sign-in/no-access pages, static assets, Sanity Studio
  const isPublic =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/no-access") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublic) return NextResponse.next();

  // Redirect unauthenticated users to sign-in
  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // The authoritative portal_access check lives in the portal layout (DB
  // query on every page navigation). Middleware does not duplicate that
  // check — it only handles authentication. The layout redirect to
  // /no-access is what blocks users without portal_access.

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
