import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDatabase } from "./server-data";

export async function ensureCurrentUserIsAdmin() {
  const user = await getChatGPTUser();
  if (!user) return { ok: false as const, reason: "signin" as const };

  const db = await getDatabase();
  const existingAdmin = await db
    .prepare("SELECT id, email, name FROM admins WHERE email = ? LIMIT 1")
    .bind(user.email.toLowerCase())
    .first<{ id: string; email: string; name: string }>();
  if (existingAdmin) {
    return { ok: true as const, user, admin: existingAdmin };
  }

  const count = await db
    .prepare("SELECT COUNT(*) AS total FROM admins")
    .first<{ total: number }>();
  if ((count?.total ?? 0) > 0) {
    return { ok: false as const, reason: "forbidden" as const, user };
  }

  const admin = {
    id: crypto.randomUUID(),
    email: user.email.toLowerCase(),
    name: user.fullName ?? user.email,
  };
  await db
    .prepare("INSERT INTO admins (id, email, name) VALUES (?, ?, ?)")
    .bind(admin.id, admin.email, admin.name)
    .run();
  return { ok: true as const, user, admin };
}

export async function requireAdminApi() {
  const result = await ensureCurrentUserIsAdmin();
  if (!result.ok) return null;
  return result;
}
