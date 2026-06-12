import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Auth guard (TECH_PRD §6.1)
//
// Route groups (app) and (marketing) are both exposed at the same URL
// namespace. Middleware guards all non-public paths: any path not in the
// public list requires a valid session → 302 /login?next={path}.
//
// NOTE: We do NOT import 'auth' from '@lib/auth' here because it initializes
// Prisma, which is not compatible with Next.js Middleware (Edge Runtime).
// Instead, we check for the existence of the session cookie as a first-pass
// guard. Real session validation happens in RSCs and Server Actions.
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/login/organizer"]);
const PUBLIC_PREFIXES = ["/api/auth/", "/api/org-auth/", "/api/dev/", "/_next/", "/favicon.ico", "/.well-known/"];

const APP_PREFIXES = [
  "/organizer",
  "/tm",
  "/player",
  "/api/",
  "/login",
  "/signup",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    !APP_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isPublicPath) {
    const isOrganizerPath = pathname.startsWith("/organizer");

    if (isOrganizerPath) {
      const orgToken =
        request.cookies.get("skrammm-org.session_token") ||
        request.cookies.get("__Secure-skrammm-org.session_token");
      if (!orgToken) {
        const url = new URL("/login/organizer", request.url);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    } else {
      const appToken =
        request.cookies.get("skrammm.session_token") ||
        request.cookies.get("__Secure-skrammm.session_token");
      if (!appToken) {
        const url = new URL("/login", request.url);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
