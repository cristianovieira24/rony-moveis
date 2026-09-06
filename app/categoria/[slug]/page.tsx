import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { CATEGORY_META_BY_SLUG } from "@/lib/category-meta";
import { getPublicSnapshot } from "@/lib/server-data";
import { whatsappUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await getPublicSnapshot();
  const category = snapshot.categories.find((item) => item.slug === slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `${category.description} Conheça as opções da Rony Móveis em Goiânia.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snapshot = await getPublicSnapshot();
  const category = snapshot.categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const meta = CATEGORY_META_BY_SLUG[slug];
  const children = snapshot.categories.filter((item) => item.parentId === category.id);
  const categoryIds = new Set([category.id, ...children.map((item) => item.id)]);
  const products = snapshot.products.filter((product) => categoryIds.has(product.categoryId));
  const otherCategories = snapshot.categories.filter((item) => item.slug !== slug && item.parentId === null);
  const message = `Olá, Rony Móveis! Gostaria de conhecer as opções de ${category.name.toLocaleLowerCase("pt-BR")}.`;

  return (
    <main className="category-page">
      <section className="category-page-hero">
        <div className="category-page-copy">
          <Link className="category-back" href="/catalogo"><ArrowLeft size={16} /> Voltar ao catálogo</Link>
          <span className="eyebrow">Categoria Rony Móveis</span>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
          {meta?.examples?.length ? (
            <div className="category-examples" aria-label="Tipos disponíveis">
              {meta.examples.map((example) => <span key={example}>{example}</span>)}
            </div>
          ) : null}
          {children.length > 0 && <div className="category-subnav" aria-label="Subcategorias">{children.map((child) => <Link href={`/categoria/${child.slug}`} key={child.id}>{child.name}<ArrowUpRight size={13} /></Link>)}</div>}
          <a className="button button-primary" href={whatsappUrl(message, snapshot.settings.whatsappNumber)} target="_blank" rel="noreferrer">
            Consultar esta categoria <MessageCircle size={18} />
          </a>
        </div>
        <div className="category-page-image">
          <img src={category.imageUrl || meta?.heroImage || meta?.image || "/images/spaces/loja-rony.webp"} alt={category.name} />
          <div>
            <span>{products.length ? String(products.length).padStart(2, "0") : "Loja"}</span>
            <small>{products.length ? (products.length === 1 ? "item no catálogo" : "itens no catálogo") : "consulte opções"}</small>
          </div>
        </div>
      </section>

      <section className="category-products section-pad">
        <div className="section-heading section-heading-row" data-reveal>
          <div>
            <span className="eyebrow">Explore {category.name}</span>
            <h2>{products.length ? "Escolha, compare e fale com a gente." : "Mais opções estão na loja."}</h2>
          </div>
          <Link className="text-link" href="/catalogo">Ver catálogo completo <ArrowRight size={17} /></Link>
        </div>

        {products.length ? (
          <div className="product-grid">
            {products.map((product, index) => <ProductCard product={product} index={index} key={product.id} />)}
          </div>
        ) : (
          <div className="category-empty" data-reveal>
            <div>
              <span>Catálogo em atualização</span>
              <h2>Nem tudo o que temos na loja já está aqui.</h2>
              <p>Fale com a equipe e diga o que procura. Enviamos fotos, medidas, acabamentos e valores disponíveis pelo WhatsApp.</p>
            </div>
            <a className="button button-whatsapp" href={whatsappUrl(message, snapshot.settings.whatsappNumber)} target="_blank" rel="noreferrer">
              Ver opções no WhatsApp <ArrowUpRight size={18} />
            </a>
          </div>
        )}
      </section>

      <section className="more-categories section-pad">
        <div className="section-heading" data-reveal>
          <span className="eyebrow">Continue explorando</span>
          <h2>Outras categorias.</h2>
        </div>
        <div className="category-mini-grid">
          {otherCategories.map((item, index) => {
            const itemMeta = CATEGORY_META_BY_SLUG[item.slug];
            return (
              <Link href={`/categoria/${item.slug}`} key={item.id} data-reveal style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}>
                <img src={item.imageUrl || itemMeta?.image || "/images/spaces/loja-rony.webp"} alt="" loading="lazy" />
                <div><span>{itemMeta?.kicker}</span><strong>{item.name}</strong></div>
                <ArrowUpRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
