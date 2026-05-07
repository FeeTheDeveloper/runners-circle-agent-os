import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/sign-out",
  "/auth/callback",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

const PUBLIC_PREFIXES = ["/api/public/", "/_next/static/", "/_next/image/", "/assets/", "/images/", "/videos/"];
const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/studio", "/agents", "/media", "/campaigns", "/promotions", "/operator", "/settings"];

function matchesPathPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix));
}

function isPublicPath(pathname: string) {
  return PUBLIC_EXACT_PATHS.has(pathname) || matchesPathPrefix(pathname, PUBLIC_PREFIXES);
}

function isProtectedPagePath(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/public/");
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { response, user, isConfigured } = await refreshSupabaseSession(request);

  if (!isConfigured) {
    return NextResponse.next({ request });
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user && isProtectedApiPath(pathname)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Authentication is required for this API route.",
          code: "UNAUTHORIZED",
        },
      },
      { status: 401 },
    );
  }

  if (!user && isProtectedPagePath(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|videos).*)", "/api/:path*"],
};
