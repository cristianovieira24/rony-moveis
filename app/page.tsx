import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Compass,
  Camera,
  MapPin,
  MessageCircle,
  Ruler,
  Sparkles,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { CATEGORY_META_BY_SLUG } from "@/lib/category-meta";
import { getPublicSnapshot } from "@/lib/server-data";
import { whatsappUrl } from "@/lib/whatsapp";

export const revalidate = 3600;

export default async function Home() {
  const { products, categories, campaign, settings } = await getPublicSnapshot();
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const heroProduct = featured[0];
  const mainCategories = categories.filter((category) => category.parentId === null && category.featured);
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: settings.businessName,
    telephone: settings.phone,
    email: settings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Av. C-12, 108",
      addressLocality: "Goiânia",
      addressRegion: "GO",
      postalCode: "74305-010",
      addressCountry: "BR",
    },
    sameAs: [settings.instagramUrl],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <div className="announcement-bar">
        <span>{settings.announcement}</span>
        <Link href="/orcamento">Peça seu orçamento <ArrowRight size={14} /></Link>
      </div>

      {campaign.active && <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow"><Sparkles size={15} /> {campaign.eyebrow}</span>
          <h1>{campaign.title}</h1>
          <p>{campaign.description}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={campaign.ctaHref}>
              {campaign.ctaLabel} <ArrowUpRight size={18} />
            </Link>
            <Link className="button button-ghost" href="/orcamento">
              Começar um orçamento <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-index">
            <div><b>01</b><span>Móveis prontos</span></div>
            <div><b>02</b><span>Projetos sob medida</span></div>
            <div><b>03</b><span>Atendimento próximo</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Ambiente planejado Rony Móveis">
          <div className="hero-image-mask">
            <img src={campaign.imageUrl} alt="Ambiente de escritório planejado" decoding="async" fetchPriority="high" />
          </div>
          <div className="hero-card hero-card-top">
            <span>Do produto ao projeto</span>
            <strong>Escolhas para cada espaço.</strong>
          </div>
          {heroProduct && <div className="hero-card hero-card-bottom"><img src={heroProduct.images[0] || "/images/spaces/loja-rony.webp"} alt={heroProduct.name} /><div><span>Em destaque</span><strong>{heroProduct.name}</strong><Link href={`/produto/${heroProduct.slug}`}>Conhecer <ArrowUpRight size={14} /></Link></div></div>}
          <a className="hero-scroll" href="#categorias" aria-label="Ir para categorias">
            <ArrowDown size={18} />
          </a>
        </div>
      </section>}

      <section className="category-section section-pad" id="categorias">
        <div className="section-heading" data-reveal>
          <span className="eyebrow">Tudo em um só lugar</span>
          <h2>Encontre o que o seu espaço pede.</h2>
          <p>Explore por categoria ou fale com a equipe para chegar à melhor escolha.</p>
        </div>
        <div className="category-grid">
          {mainCategories.map((category, index) => (
            <Link
              href={`/categoria/${category.slug}`}
              className={`category-card category-card-${index + 1} is-${category.imageFit}`}
              key={category.id}
              data-reveal
              style={{ "--delay": `${index * 60}ms` } as React.CSSProperties}
            >
              <img src={category.imageUrl || CATEGORY_META_BY_SLUG[category.slug]?.image || "/images/spaces/loja-rony.webp"} alt="" loading="lazy" decoding="async" />
              <span className="category-number">0{index + 1}</span>
              <div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
              <span className="category-arrow"><ArrowUpRight size={18} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-section section-pad">
        <div className="section-heading section-heading-row" data-reveal>
          <div>
            <span className="eyebrow">Seleção Rony</span>
            <h2>Peças que merecem atenção.</h2>
          </div>
          <Link className="text-link" href="/catalogo">Ver catálogo completo <ArrowRight size={17} /></Link>
        </div>
        <div className="product-grid">
          {featured.map((product, index) => <ProductCard product={product} index={index} key={product.id} />)}
        </div>
      </section>

      <section className="planned-story" id="planejados">
        <div className="planned-image-main" data-reveal>
          <img src="/images/spaces/cozinha-cobre.webp" alt="Cozinha planejada em acabamento cobre" loading="lazy" />
          <span className="image-caption">Projeto pensado para o espaço real</span>
        </div>
        <div className="planned-copy" data-reveal>
          <span className="eyebrow">Móveis planejados</span>
          <h2>Da primeira medida ao ambiente pronto.</h2>
          <p>
            Um bom planejado não começa pelo móvel. Começa pela rotina, pelas medidas e pelo que precisa funcionar melhor no dia a dia.
          </p>
          <div className="planned-steps">
            <div><span>01</span><strong>Você mostra a ideia</strong><p>Conte o ambiente, referências e o que precisa resolver.</p></div>
            <div><span>02</span><strong>A gente entende o espaço</strong><p>Medidas, uso, acabamento e faixa de investimento.</p></div>
            <div><span>03</span><strong>Construímos a proposta</strong><p>Uma conversa objetiva para chegar ao projeto certo.</p></div>
          </div>
          <Link className="button button-light" href="/orcamento">Começar meu projeto <ArrowRight size={18} /></Link>
        </div>
        <div className="planned-image-detail" data-reveal>
          <img src="/images/spaces/marcenaria-nogueira.webp" alt="Detalhe de marcenaria em nogueira" loading="lazy" />
        </div>
      </section>

      <section className="service-rail" aria-label="Diferenciais">
        <div><BadgeCheck size={21} /><span><strong>Curadoria de produtos</strong> para diferentes necessidades</span></div>
        <div><Ruler size={21} /><span><strong>Planejados sob medida</strong> para casa e trabalho</span></div>
        <div><MessageCircle size={21} /><span><strong>Atendimento humano</strong> antes, durante e depois</span></div>
      </section>

      <section className="store-section section-pad" id="loja">
        <div className="store-copy" data-reveal>
          <span className="eyebrow">Rony Móveis em Goiânia</span>
          <h2>Veja de perto. Sente. Compare. Escolha bem.</h2>
          <p>
            Nossa loja reúne cadeiras, poltronas, móveis para casa e escritório, além do atendimento para projetos planejados.
          </p>
          <div className="store-facts">
            <div><MapPin size={19} /><span>{settings.shortAddress}</span></div>
            <div><Compass size={19} /><a href={settings.mapUrl} target="_blank" rel="noreferrer">Abrir rota no Google Maps <ArrowUpRight size={14} /></a></div>
          </div>
          <a className="button button-outline" href={whatsappUrl("Olá, Rony Móveis! Gostaria de saber mais sobre os produtos disponíveis na loja.", settings.whatsappNumber)} target="_blank" rel="noreferrer">
            Falar com Rony Móveis <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="store-image" data-reveal>
          <img src="/images/spaces/loja-rony.webp" alt="Fachada da Rony Móveis em Goiânia" loading="lazy" />
          <span>Loja física · Setor Sudoeste</span>
        </div>
      </section>

      <section className="instagram-cta section-pad" data-reveal>
        <div><Camera size={26} /><span>Acompanhe novidades, ofertas e produtos que chegam à loja.</span></div>
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer">@ronymoveisgoiania <ArrowUpRight size={18} /></a>
      </section>

      <section className="closing-cta section-pad" data-reveal>
        <div className="closing-copy">
          <span className="eyebrow">Não sabe por onde começar?</span>
          <h2>Conte o que você precisa. A gente organiza o próximo passo.</h2>
        </div>
        <div className="closing-action">
          <p>Responda algumas perguntas, envie referências e receba um atendimento muito mais objetivo.</p>
          <Link className="button button-primary" href="/orcamento">Montar meu orçamento <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}
