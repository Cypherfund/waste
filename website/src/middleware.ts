import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./i18n/config";

function detectLocale(request: NextRequest): string {
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const preferred = acceptLang.split(",").map((l) => l.split(";")[0].trim().substring(0, 2));
    for (const lang of preferred) {
      if ((i18n.locales as readonly string[]).includes(lang)) return lang;
    }
  }
  return i18n.defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal paths and assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return;
  }

  // Redirect old /en/* or /fr/* URLs to clean paths and set cookie
  for (const locale of i18n.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      const cleanPath = pathname.replace(`/${locale}`, "") || "/";
      const response = NextResponse.redirect(new URL(cleanPath, request.url));
      response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
      return response;
    }
  }

  // If no locale cookie yet, set one from browser Accept-Language
  const existing = request.cookies.get("NEXT_LOCALE")?.value;
  if (!existing || !(i18n.locales as readonly string[]).includes(existing)) {
    const locale = detectLocale(request);
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
