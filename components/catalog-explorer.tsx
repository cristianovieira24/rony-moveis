"use client";

import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CATEGORY_META_BY_SLUG } from "@/lib/category-meta";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "./product-card";

export function CatalogExplorer({ products, categories }: { products: Product[]; categories: Category[] }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("categoria") ?? "todos";
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [onlyOffers, setOnlyOffers] = useState(false);

  const mainCategories = useMemo(() => categories.filter((item) => item.parentId === null && item.featured), [categories]);

  const categoryCounts = useMemo(() => {
    return products.reduce<Record<string, number>>((counts, product) => {
      counts[product.categorySlug] = (counts[product.categorySlug] ?? 0) + 1;
      const productCategory = categories.find((item) => item.id === product.categoryId);
      const parent = productCategory?.parentId ? categories.find((item) => item.id === productCategory.parentId) : null;
      if (parent) counts[parent.slug] = (counts[parent.slug] ?? 0) + 1;
      return counts;
    }, {});
  }, [categories, products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const productCategory = categories.find((item) => item.id === product.categoryId);
      const parent = productCategory?.parentId ? categories.find((item) => item.id === productCategory.parentId) : null;
      const matchesCategory = category === "todos" || product.categorySlug === category || parent?.slug === category;
      const haystack = `${product.name} ${product.eyebrow} ${product.shortDescription} ${product.description} ${product.categoryName} ${parent?.name ?? ""} ${product.features.join(" ")} ${product.searchTerms}`.toLocaleLowerCase("pt-BR");
      const matchesQuery = !needle || haystack.includes(needle);
      const matchesOffer = !onlyOffers || product.oldPriceCents !== null;
      return matchesCategory && matchesQuery && matchesOffer;
    });
  }, [categories, category, onlyOffers, products, query]);

  return (
    <main className="catalog-page">
      <section className="catalog-hero">
        <div>
          <span className="eyebrow">Catálogo Rony Móveis</span>
          <h1>Encontre por categoria. Escolha com calma.</h1>
        </div>
        <p>Cadeiras, poltronas, estofados, móveis para escritório, planejados e aço — tudo organizado para você chegar mais rápido ao que procura.</p>
      </section>

      <section className="catalog-directory section-pad" aria-labelledby="catalog-directory-title">
        <div className="catalog-directory-head">
          <span id="catalog-directory-title">Comprar por categoria</span>
          <small>Selecione uma linha para ver a página completa</small>
        </div>
        <div className="catalog-directory-grid">
          {mainCategories.map((item) => {
            const meta = CATEGORY_META_BY_SLUG[item.slug];
            return (
              <Link href={`/categoria/${item.slug}`} key={item.id}>
                <span className={`catalog-directory-image is-${item.imageFit}`}><img src={item.imageUrl || meta?.image || "/images/spaces/loja-rony.webp"} alt="" loading="lazy" decoding="async" /></span>
                <span className="catalog-directory-copy">
                  <strong>{meta?.shortName ?? item.name}</strong>
                  <small>{categoryCounts[item.slug] ? `${categoryCounts[item.slug]} ${categoryCounts[item.slug] === 1 ? "item" : "itens"}` : "Consulte opções"}</small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="catalog-tools" aria-label="Filtros do catálogo">
        <div className="catalog-search">
          <Search size={19} strokeWidth={1.7} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cadeira, poltrona, planejado…" aria-label="Buscar produtos" />
          {query && <button onClick={() => setQuery("")} aria-label="Limpar busca"><X size={16} /></button>}
        </div>
        <div className="catalog-filter-row">
          <button className={category === "todos" ? "is-active" : ""} onClick={() => setCategory("todos")}>Todos</button>
          {categories.map((item) => (
            <button className={category === item.slug ? "is-active" : ""} onClick={() => setCategory(item.slug)} key={item.id}>{item.name}</button>
          ))}
        </div>
        <button className={`offer-filter ${onlyOffers ? "is-active" : ""}`} onClick={() => setOnlyOffers((value) => !value)}>
          <SlidersHorizontal size={16} /> Somente ofertas
        </button>
      </section>

      <section className="catalog-results section-pad">
        <div className="catalog-result-head">
          <span>{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</span>
          {(category !== "todos" || query || onlyOffers) && (
            <button onClick={() => { setCategory("todos"); setQuery(""); setOnlyOffers(false); }}>Limpar filtros</button>
          )}
        </div>
        {filtered.length ? (
          <div className="product-grid product-grid-catalog">
            {filtered.map((product, index) => <ProductCard product={product} index={index} key={product.id} />)}
          </div>
        ) : (
          <div className="catalog-empty">
            <Search size={28} strokeWidth={1.4} />
            <h2>Nenhum produto apareceu com esses filtros.</h2>
            <p>Tente outro termo ou fale com a equipe — nem tudo que temos na loja já está no catálogo.</p>
            <button className="button button-outline" onClick={() => { setCategory("todos"); setQuery(""); setOnlyOffers(false); }}>Ver todos</button>
          </div>
        )}
      </section>
    </main>
  );
}
