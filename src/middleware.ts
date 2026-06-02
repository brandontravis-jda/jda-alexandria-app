import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow: auth routes, sign-in page, static assets, Sanity Studio
  const isPublic =
    pathname.startsWith("/sign-in") ||
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

  // Fast-path portal_access check from the session (populated from the JWT
  // in the session callback). Owners and admins always pass; regular users
  // must have portal_access = true. The portal layout does an authoritative
  // DB re-check so revocations take effect on next page navigation.
  const session = req.auth as unknown as Record<string, unknown> | null;
  const accountType = session?.accountType as string | undefined;
  const portalAccess = session?.portalAccess as boolean | undefined;

  if (accountType !== "owner" && accountType !== "admin" && portalAccess !== true) {
    // API routes get a 403 JSON response instead of a redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Portal access not granted. Contact your administrator." },
        { status: 403 }
      );
    }
    const denied = new URL("/sign-in", req.url);
    denied.searchParams.set("error", "PortalAccessDenied");
    return NextResponse.redirect(denied);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
