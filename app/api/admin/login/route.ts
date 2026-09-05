import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, createAdminSessionToken, verifyAdminCredentials } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!(await verifyAdminCredentials(email, password))) {
    return NextResponse.redirect(new URL("/admin/login?erro=1", request.url), 303);
  }
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_COOKIE, createAdminSessionToken(email), adminCookieOptions);
  return response;
}
