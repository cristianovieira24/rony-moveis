"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, MessageCircle, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { CATEGORY_META_BY_SLUG } from "@/lib/category-meta";
import type { Category } from "@/lib/types";
import { whatsappUrl } from "@/lib/whatsapp";
import { useSelection } from "./selection-provider";
import { useSiteConfig } from "./site-config-provider";

const nav = [
  { href: "/#planejados", label: "Planejados" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/#loja", label: "A loja" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader({ categories }: { categories: Category[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { total, open } = useSelection();
  const settings = useSiteConfig();
  const mainCategories = categories.filter((category) => category.parentId === null && category.featured);

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
                    {mainCategories.map((category) => (
                      <Link href={`/categoria/${category.slug}`} key={category.slug} onClick={() => setCategoriesOpen(false)}>
                        <img src={category.imageUrl || CATEGORY_META_BY_SLUG[category.slug]?.image || "/images/spaces/loja-rony.webp"} alt="" />
                        <span><small>{categories.some((item) => item.parentId === category.id) ? `${categories.filter((item) => item.parentId === category.id).length} linhas` : "Explore a categoria"}</small><strong>{category.name}</strong></span>
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
            <form className="header-search" action="/catalogo" role="search">
              <Search size={17} />
              <input name="q" placeholder="Buscar produtos" aria-label="Buscar produtos" />
            </form>
            <Link className="header-search-compact" href="/catalogo" aria-label="Buscar produtos">
              <Search size={18} />
            </Link>
            <button className="selection-trigger" onClick={open} aria-label={`Abrir seleção com ${total} itens`}>
              <ShoppingBag size={18} strokeWidth={1.7} />
              <span>Seleção</span>
              <b>{total}</b>
            </button>
            <a className="header-whatsapp" href={whatsappUrl("Olá, Rony Móveis! Gostaria de atendimento.", settings.whatsappNumber)} target="_blank" rel="noreferrer">
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
        <form className="mobile-search" action="/catalogo" role="search"><Search size={18} /><input name="q" placeholder="O que você procura?" aria-label="Buscar produtos" /><button type="submit">Buscar</button></form>
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
            {mainCategories.map((category) => (
              <Link href={`/categoria/${category.slug}`} key={category.slug} onClick={() => setMenuOpen(false)}>
                {category.name}<ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </div>
        <a href={whatsappUrl("Olá, Rony Móveis! Gostaria de atendimento.", settings.whatsappNumber)} target="_blank" rel="noreferrer">
          WhatsApp {settings.phone}
        </a>
      </div>
    </>
  );
}

export function SiteFooter({ categories }: { categories: Category[] }) {
  const settings = useSiteConfig();
  const mainCategories = categories.filter((category) => category.parentId === null && category.active);
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <img src="/brand/logo-horizontal-clara.svg" alt="Rony Móveis" />
          <p>{settings.tagline} Atendimento em Goiânia.</p>
        </div>
        <div>
          <span className="footer-label">Categorias</span>
          {mainCategories.slice(0, 3).map((category) => <Link href={`/categoria/${category.slug}`} key={category.id}>{category.name}</Link>)}
        </div>
        <div>
          <span className="footer-label">Mais opções</span>
          {mainCategories.slice(3, 6).map((category) => <Link href={`/categoria/${category.slug}`} key={category.id}>{category.name}</Link>)}
        </div>
        <div>
          <span className="footer-label">Converse</span>
          <a href={whatsappUrl("Olá, Rony Móveis! Gostaria de atendimento.", settings.whatsappNumber)} target="_blank" rel="noreferrer">{settings.phone}</a>
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
          <p>{settings.address}</p>
          <a href={settings.mapUrl} target="_blank" rel="noreferrer">Abrir no mapa <ArrowUpRight size={14} /></a>
          <a href={settings.instagramUrl} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14} /></a>
          <small>{settings.openingHours}</small>
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
