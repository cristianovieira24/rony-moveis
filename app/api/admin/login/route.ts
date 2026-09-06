import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, createAdminSessionToken, verifyAdminCredentials } from "@/lib/admin-auth";
import { clientIp, consumeRateLimit, isSameOriginMutation } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.redirect(new URL("/admin/login?erro=1", request.url), 303);
  const rate = consumeRateLimit(`admin-login:${clientIp(request)}`, 6, 15 * 60 * 1000);
  if (!rate.allowed) {
    const response = NextResponse.redirect(new URL("/admin/login?erro=limite", request.url), 303);
    response.headers.set("Retry-After", String(rate.retryAfter));
    return response;
  }
  const form = await request.formData();
  const email = String(form.get("email") ?? "").slice(0, 180);
  const password = String(form.get("password") ?? "").slice(0, 300);
  if (!(await verifyAdminCredentials(email, password))) {
    return NextResponse.redirect(new URL("/admin/login?erro=1", request.url), 303);
  }
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_COOKIE, createAdminSessionToken(email), adminCookieOptions);
  return response;
}
