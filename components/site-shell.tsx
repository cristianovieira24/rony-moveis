"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, MessageCircle, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { CATEGORY_META } from "@/lib/category-meta";
import { STORE_ADDRESS, STORE_PHONE } from "@/lib/catalog";
import { whatsappUrl } from "@/lib/whatsapp";
import { useSelection } from "./selection-provider";

const nav = [
  { href: "/#planejados", label: "Planejados" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/#loja", label: "A loja" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { total, open } = useSelection();

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand-link" aria-label="Rony Móveis — início">
            <img src="/brand/logo-horizontal.svg" alt="Rony Móveis" />
          </Link>
          <nav className="desktop-nav" aria-label="Navegação principal">
            <div className="catalog-nav" onMouseEnter={() => setCategoriesOpen(true)} onMouseLeave={() => setCategoriesOpen(false)}>
              <button
                className="catalog-nav-trigger"
                onClick={() => setCategoriesOpen((value) => !value)}
                aria-expanded={categoriesOpen}
                aria-controls="category-mega-menu"
              >
                Produtos <ChevronDown size={14} />
              </button>
              <div className={`category-mega ${categoriesOpen ? "is-open" : ""}`} id="category-mega-menu">
                <div className="category-mega-inner">
                  <div className="category-mega-heading">
                    <span>Comprar por categoria</span>
                    <strong>Encontre o móvel certo para cada espaço.</strong>
                    <Link href="/catalogo" onClick={() => setCategoriesOpen(false)}>Ver todos os produtos <ArrowRight size={15} /></Link>
                  </div>
                  <div className="category-mega-grid">
                    {CATEGORY_META.map((category) => (
                      <Link href={`/categoria/${category.slug}`} key={category.slug} onClick={() => setCategoriesOpen(false)}>
                        <img src={category.image} alt="" />
                        <span><small>{category.kicker}</small><strong>{category.shortName}</strong></span>
                        <ArrowUpRight size={16} />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {nav.map((item) => (
              <Link href={item.href} key={item.href}>{item.label}</Link>
            ))}
          </nav>
          <div className="header-actions">
            <button className="selection-trigger" onClick={open} aria-label={`Abrir seleção com ${total} itens`}>
              <ShoppingBag size={18} strokeWidth={1.7} />
              <span>Seleção</span>
              <b>{total}</b>
            </button>
            <a className="header-whatsapp" href={whatsappUrl("Olá, Rony Móveis! Gostaria de atendimento.")} target="_blank" rel="noreferrer">
              <MessageCircle size={18} strokeWidth={1.7} />
              <span>Falar agora</span>
            </a>
            <button className="menu-trigger" onClick={() => setMenuOpen((value) => !value)} aria-label="Abrir menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <nav aria-label="Navegação móvel">
          <Link href="/catalogo" onClick={() => setMenuOpen(false)}>
            <span>01</span>Todos os produtos<ArrowUpRight size={20} />
          </Link>
          {nav.map((item, index) => (
              <Link href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
              <span>0{index + 2}</span>{item.label}<ArrowUpRight size={20} />
            </Link>
          ))}
        </nav>
        <div className="mobile-categories">
          <span>Comprar por categoria</span>
          <div>
            {CATEGORY_META.map((category) => (
              <Link href={`/categoria/${category.slug}`} key={category.slug} onClick={() => setMenuOpen(false)}>
                {category.shortName}<ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </div>
        <a href={whatsappUrl("Olá, Rony Móveis! Gostaria de atendimento.")} target="_blank" rel="noreferrer">
          WhatsApp {STORE_PHONE}
        </a>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <img src="/brand/logo-horizontal-clara.svg" alt="Rony Móveis" />
          <p>Móveis para casa e escritório, planejados, cadeiras e estofados em Goiânia.</p>
        </div>
        <div>
          <span className="footer-label">Categorias</span>
          <Link href="/categoria/cadeiras">Cadeiras</Link>
          <Link href="/categoria/poltronas">Poltronas</Link>
          <Link href="/categoria/escritorio">Móveis para escritório</Link>
        </div>
        <div>
          <span className="footer-label">Mais opções</span>
          <Link href="/categoria/planejados">Planejados</Link>
          <Link href="/categoria/estofados">Estofados</Link>
          <Link href="/categoria/moveis-de-aco">Móveis de aço</Link>
        </div>
        <div>
          <span className="footer-label">Converse</span>
          <a href={whatsappUrl("Olá, Rony Móveis! Gostaria de atendimento.")} target="_blank" rel="noreferrer">{STORE_PHONE}</a>
          <a href="mailto:ronymoveis12@gmail.com">ronymoveis12@gmail.com</a>
          <p>{STORE_ADDRESS}</p>
          <a href="https://maps.app.goo.gl/5Nz2rNHnaPNy8KGv9" target="_blank" rel="noreferrer">Abrir no mapa <ArrowUpRight size={14} /></a>
          <a href="https://www.instagram.com/ronymoveisgoiania/" target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14} /></a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Rony Móveis</span>
        <span>Atendimento próximo. Escolhas que duram.</span>
        <Link href="/admin">Área administrativa</Link>
      </div>
    </footer>
  );
}
