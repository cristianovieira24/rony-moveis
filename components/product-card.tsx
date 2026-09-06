"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { AVAILABILITY_LABELS, formatPrice, productPriceText } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { useSelection } from "./selection-provider";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add, has } = useSelection();
  const selected = has(product.id);
  const oldPrice = formatPrice(product.oldPriceCents);

  return (
    <article className={`product-card ${product.images[0]?.includes("/spaces/") ? "is-scene" : ""}`} data-reveal style={{ "--delay": `${Math.min(index, 5) * 70}ms` } as React.CSSProperties}>
      <Link href={`/produto/${product.slug}`} className="product-card-media" aria-label={`Ver ${product.name}`}>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <img src={product.images[0] || "/images/spaces/marcenaria-nogueira.webp"} alt={product.name} loading="lazy" decoding="async" />
        <span className="product-view-icon"><ArrowUpRight size={19} strokeWidth={1.6} /></span>
      </Link>
      <div className="product-card-body">
        <div className="product-card-meta"><span className="product-category">{product.categoryName}</span><span className={`availability-tag is-${product.availability}`}>{AVAILABILITY_LABELS[product.availability]}</span></div>
        <h3><Link href={`/produto/${product.slug}`}>{product.name}</Link></h3>
        <p>{product.shortDescription}</p>
        <div className="product-card-bottom">
          <div className="product-price">
            {oldPrice && <del>{oldPrice}</del>}
            <strong>{productPriceText(product)}</strong>
          </div>
          <button
            className={`add-selection ${selected ? "is-selected" : ""}`}
            onClick={() => !selected && add({ id: product.id, slug: product.slug, name: product.name, image: product.images[0] })}
            aria-label={selected ? `${product.name} já está na seleção` : `Adicionar ${product.name} à seleção`}
          >
            {selected ? <Check size={17} /> : <Plus size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
