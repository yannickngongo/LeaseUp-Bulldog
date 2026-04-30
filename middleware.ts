import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Routes that require Pro or Portfolio plan
const PRO_ROUTES = ["/portfolio", "/automations", "/competitors", "/insights"];

// Plan slugs that qualify as Pro or above
const PRO_PLANS = new Set(["pro", "portfolio", "growth", "enterprise"]);

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must call getUser() not getSession() per Supabase SSR docs
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Plan gating for Pro-only routes ──────────────────────────────────────────
  const pathname = req.nextUrl.pathname;
  const isProRoute = PRO_ROUTES.some(r => pathname.startsWith(r));

  if (isProRoute) {
    // Read from 5-minute plan cache cookie to avoid a DB hit on every request
    const cachedPlan = req.cookies.get("lub_plan")?.value;
    let plan = cachedPlan;

    if (!plan) {
      // Use service role so we can read operators regardless of RLS policy
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const admin = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey,
          { cookies: { getAll: () => [], setAll: () => {} } }
        );
        const { data: op } = await admin
          .from("operators")
          .select("plan")
          .eq("email", user.email!)
          .maybeSingle();
        plan = op?.plan ?? "starter";
      } else {
        plan = "starter";
      }
      // Cache for 5 minutes
      res.cookies.set("lub_plan", plan ?? "starter", {
        maxAge: 300,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }

    if (!PRO_PLANS.has(plan ?? "starter")) {
      const upgradeUrl = req.nextUrl.clone();
      upgradeUrl.pathname = "/billing";
      upgradeUrl.searchParams.set("upgrade", "1");
      upgradeUrl.searchParams.set("feature", pathname.split("/")[1]);
      const redirect = NextResponse.redirect(upgradeUrl);
      // Persist the plan cookie on the redirect response too
      if (!cachedPlan && plan) {
        redirect.cookies.set("lub_plan", plan, {
          maxAge: 300,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
        });
      }
      return redirect;
    }
  }

  // ── Security headers on all SSR responses ────────────────────────────────────
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Content Security Policy — allow self, our own subdomains, and trusted third parties.
  // 'unsafe-inline' on style is unavoidable with Tailwind's runtime; we whitelist scripts
  // explicitly. Adjust the connect-src list if you add new third-party APIs.
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io https://*.ingest.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.anthropic.com https://api.twilio.com https://api.hubapi.com https://graph.facebook.com https://*.sentry.io https://*.ingest.sentry.io",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/properties/:path*",
    "/calendar/:path*",
    "/automations/:path*",
    "/marketing/:path*",
    "/insights/:path*",
    "/settings/:path*",
    "/competitors/:path*",
    "/reports/:path*",
    "/integrations/:path*",
    "/portfolio/:path*",
    "/renewals/:path*",
    "/billing/:path*",
    "/onboarding/:path*",
    "/getting-started/:path*",
  ],
};
