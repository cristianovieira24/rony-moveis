import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "rony_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = { email: string; exp: number };

function adminConfig() {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const configuredSessionSecret = process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
  const derivedSessionSecret = password
    ? createHash("sha256").update(`rony-moveis-admin-session:${password}`).digest("base64url")
    : "";

  return {
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "",
    password,
    passwordHash: process.env.ADMIN_PASSWORD_HASH?.trim() ?? "",
    sessionSecret: configuredSessionSecret || derivedSessionSecret,
  };
}

export function isAdminConfigured() {
  const config = adminConfig();
  return Boolean(
    config.email &&
      (config.password || config.passwordHash) &&
      config.sessionSecret.length >= 32,
  );
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminSessionToken(email: string) {
  const { sessionSecret } = adminConfig();
  if (sessionSecret.length < 32) throw new Error("ADMIN_SESSION_SECRET não foi configurado.");
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS } satisfies SessionPayload),
  ).toString("base64url");
  return `${payload}.${signature(payload, sessionSecret)}`;
}

function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const { email, sessionSecret } = adminConfig();
  if (!email || sessionSecret.length < 32) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  const expectedSignature = signature(payload, sessionSecret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (parsed.email !== email || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return readSessionToken(token);
}

export async function verifyAdminCredentials(email: string, password: string) {
  const config = adminConfig();
  if (!isAdminConfigured() || email.trim().toLowerCase() !== config.email) return false;

  if (config.password) {
    const expected = createHash("sha256").update(config.password).digest();
    const supplied = createHash("sha256").update(password).digest();
    return timingSafeEqual(supplied, expected);
  }

  const [algorithm, saltValue, expectedValue] = config.passwordHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !expectedValue) return false;
  try {
    const expected = Buffer.from(expectedValue, "base64url");
    const supplied = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

export async function ensureCurrentUserIsAdmin() {
  if (!isAdminConfigured()) return { ok: false as const, reason: "unconfigured" as const };
  const session = await getAdminSession();
  if (!session) return { ok: false as const, reason: "signin" as const };
  return {
    ok: true as const,
    user: { displayName: session.email, email: session.email },
    admin: { id: session.email, email: session.email, name: session.email },
  };
}

export async function requireAdminApi() {
  const result = await ensureCurrentUserIsAdmin();
  return result.ok ? result : null;
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
