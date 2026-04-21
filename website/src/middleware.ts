import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./i18n/config";

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && (i18n.locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const preferred = acceptLang
      .split(",")
      .map((l) => l.split(";")[0].trim().substring(0, 2));
    for (const lang of preferred) {
      if ((i18n.locales as readonly string[]).includes(lang)) return lang;
    }
  }
  return i18n.defaultLocale;
}

export function middleware(request: NextRequest) {
  const locale = getLocale(request);
  const response = NextResponse.next();

  if (!request.cookies.get("NEXT_LOCALE")) {
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
