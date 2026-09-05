import { redirect } from "next/navigation";
import { chatGPTSignInPath, chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ensureCurrentUserIsAdmin } from "@/lib/admin-auth";
import { ensureSeedData, getAdminQuotes, getCampaign, getCategories, getProducts } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireChatGPTUser("/admin");
  try {
    await ensureSeedData();
  } catch {
    return (
      <main className="admin-gate">
        <img src="/brand/logo-horizontal.svg" alt="Rony Móveis" />
        <h1>O painel ainda está sendo preparado.</h1>
        <p>O banco de dados não ficou disponível nesta execução. Tente novamente depois da publicação.</p>
      </main>
    );
  }

  const access = await ensureCurrentUserIsAdmin();
  if (!access.ok && access.reason === "signin") redirect(chatGPTSignInPath("/admin"));
  if (!access.ok) {
    return (
      <main className="admin-gate">
        <img src="/brand/logo-horizontal.svg" alt="Rony Móveis" />
        <h1>Acesso restrito.</h1>
        <p>Este e-mail não faz parte da administração da Rony Móveis.</p>
        <a className="button button-outline" href={chatGPTSignOutPath("/")}>Sair desta conta</a>
      </main>
    );
  }

  const [products, categories, campaign, quotes] = await Promise.all([
    getProducts({ includeInactive: true }),
    getCategories(),
    getCampaign(),
    getAdminQuotes(),
  ]);

  return (
    <AdminDashboard
      products={products}
      categories={categories}
      campaign={campaign}
      quotes={quotes}
      adminName={access.user.displayName}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}

