import { NextResponse, type NextRequest } from "next/server";
import { isInternalOperatorModeEnabled } from "@/lib/config/internal-mode";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

const publicPagePaths = new Set(["/", "/sign-in", "/sign-up"]);
const publicPagePrefixes = ["/auth/callback", "/sign-out"];
const publicApiPaths = new Set(["/api/stripe/webhook"]);

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function isPublicPage(pathname: string) {
  return publicPagePaths.has(pathname) || publicPagePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicApi(pathname: string) {
  return publicApiPaths.has(pathname);
}

function buildSignInRedirect(request: NextRequest, message: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/sign-in";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("message", message);
  redirectUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(redirectUrl);
}

function buildApiError(message: string, status: number, code: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
      },
    },
    { status },
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRequest = pathname.startsWith("/api/");

  if (isApiRequest ? isPublicApi(pathname) : isPublicPage(pathname)) {
    return NextResponse.next();
  }

  if (isInternalOperatorModeEnabled()) {
    return NextResponse.next({ request });
  }

  const session = await refreshSupabaseSession(request);

  if (!session.isConfigured) {
    if (!isProductionRuntime()) {
      return session.response;
    }

    if (isApiRequest) {
      return buildApiError("Supabase auth is not configured on this deployment.", 503, "AUTH_CONFIGURATION_REQUIRED");
    }

    return buildSignInRedirect(request, "Supabase auth is not configured for this deployment.");
  }

  if (!session.user) {
    if (isApiRequest) {
      return buildApiError("Authentication is required for this API.", 401, "AUTH_REQUIRED");
    }

    return buildSignInRedirect(request, "Please sign in to continue.");
  }

  return session.response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
