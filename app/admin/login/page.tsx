import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession, isAdminConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Entrar na administração",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await getAdminSession()) redirect("/admin");
  const { erro } = await searchParams;
  const configured = isAdminConfigured();

  return (
    <main className="admin-gate admin-login-page">
      <section className="admin-login-card">
        <img src="/brand/logo-horizontal.svg" alt="Rony Móveis" />
        <div>
          <span className="eyebrow">Área administrativa</span>
          <h1>Entre para cuidar do catálogo.</h1>
          <p>Produtos, fotos, ofertas e pedidos de orçamento ficam organizados aqui.</p>
        </div>
        {configured ? (
          <form action="/api/admin/login" method="post" className="admin-login-form">
            <label><span>E-mail</span><input name="email" type="email" autoComplete="username" required /></label>
            <label><span>Senha</span><input name="password" type="password" autoComplete="current-password" required /></label>
            {erro && <p className="form-error">{erro === "limite" ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : "E-mail ou senha incorretos."}</p>}
            <button className="button button-primary" type="submit">Entrar no painel</button>
          </form>
        ) : (
          <p className="form-error">O acesso será liberado assim que as credenciais forem configuradas na Vercel.</p>
        )}
        <Link href="/">Voltar para o site</Link>
      </section>
    </main>
  );
}
