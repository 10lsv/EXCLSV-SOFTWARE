import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const roleRouteMap: Record<string, string[]> = {
  "/admin": ["OWNER", "ADMIN"],
  "/chatter-manager": ["OWNER", "ADMIN", "CHATTER_MANAGER"],
  "/chatter": ["OWNER", "ADMIN", "CHATTER_MANAGER", "CHATTER"],
  "/model": ["MODEL", "OWNER", "ADMIN"],
};

function getDashboardPath(role: string): string {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return "/admin/dashboard";
    case "CHATTER_MANAGER":
      return "/chatter-manager/dashboard";
    case "CHATTER":
      return "/chatter/dashboard";
    case "MODEL":
      return "/model/dashboard";
    default:
      return "/login";
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // API auth routes — always allow (signout, csrf, session, etc.)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Cron API routes — auth handled by CRON_SECRET header, not session
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  // Auth pages — redirect to dashboard if already logged in, otherwise allow
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    if (session?.user) {
      const dashboardUrl = new URL(
        getDashboardPath(session.user.role),
        req.url
      );
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // Root redirect
  if (pathname === "/") {
    if (session?.user) {
      const dashboardUrl = new URL(
        getDashboardPath(session.user.role),
        req.url
      );
      return NextResponse.redirect(dashboardUrl);
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Protected routes — must be logged in
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC check
  for (const [routePrefix, allowedRoles] of Object.entries(roleRouteMap)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(session.user.role)) {
        const dashboardUrl = new URL(
          getDashboardPath(session.user.role),
          req.url
        );
        return NextResponse.redirect(dashboardUrl);
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
