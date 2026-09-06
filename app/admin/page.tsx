import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ensureCurrentUserIsAdmin } from "@/lib/admin-auth";
import { ensureSeedData, getAdminQuotes, getCampaign, getCategories, getProducts, getSiteSettings } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const access = await ensureCurrentUserIsAdmin();
  if (!access.ok && access.reason === "signin") redirect("/admin/login");
  if (!access.ok) {
    return (
      <main className="admin-gate">
        <img src="/brand/logo-horizontal.svg" alt="Rony Móveis" />
        <h1>Painel aguardando configuração.</h1>
        <p>As credenciais administrativas precisam ser cadastradas nas variáveis da Vercel.</p>
      </main>
    );
  }

  try {
    await ensureSeedData();
  } catch (error) {
    console.error("Falha ao preparar o painel", error);
    return (
      <main className="admin-gate">
        <img src="/brand/logo-horizontal.svg" alt="Rony Móveis" />
        <h1>O painel ainda está sendo preparado.</h1>
        <p>O banco de dados não respondeu. Confira a integração do Neon na Vercel.</p>
      </main>
    );
  }

  const [products, categories, campaign, quotes, siteSettings] = await Promise.all([
    getProducts({ includeInactive: true }),
    getCategories({ includeInactive: true }),
    getCampaign(),
    getAdminQuotes(),
    getSiteSettings(),
  ]);

  return (
    <AdminDashboard
      products={products}
      categories={categories}
      campaign={campaign}
      quotes={quotes}
      siteSettings={siteSettings}
      adminName={access.user.displayName}
      signOutPath="/api/admin/logout"
    />
  );
}
