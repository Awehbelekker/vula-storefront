import { NextRequest, NextResponse } from "next/server";

// Phase 1: subdomain-only tenant resolution ({tenant}.ROOT_DOMAIN) — no DB lookup needed, the
// tenant_id is derivable from the hostname alone. Custom-domain support (Phase 2) will need a
// second branch here doing a cached domain->tenant lookup; deliberately not built yet so this
// phase ships without that latency/design question.
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "vula.site";

export function middleware(req: NextRequest) {
  const hostname = (req.headers.get("host") || "").split(":")[0];
  const suffix = `.${ROOT_DOMAIN}`;
  if (!hostname.endsWith(suffix)) {
    return NextResponse.next();
  }
  const tenant = hostname.slice(0, -suffix.length);
  if (!tenant || tenant === "www") {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${tenant}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
