import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Auth is handled client-side. Supabase session lives in localStorage,
  // not cookies, so server-side checks always fail without @supabase/ssr.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/leads/:path*", "/properties/:path*", "/calendar/:path*", "/automations/:path*", "/marketing/:path*", "/insights/:path*", "/settings/:path*"],
};
