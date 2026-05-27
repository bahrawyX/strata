import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo mode: the dashboard is browsable without authentication. The proxy
 * doesn't gate anything for now — it only handles static-asset short-circuit.
 * When real auth comes back, restore the redirect logic here.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
