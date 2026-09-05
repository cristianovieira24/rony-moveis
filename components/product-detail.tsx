"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { formatPrice } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { productWhatsAppMessage, whatsappUrl } from "@/lib/whatsapp";
import { useSelection } from "./selection-provider";

export function ProductDetail({ product }: { product: Product }) {
  const [activeImage, setActiveImage] = useState(0);
  const { add, has } = useSelection();
  const selected = has(product.id);
  const price = formatPrice(product.priceCents);
  const oldPrice = formatPrice(product.oldPriceCents);

  return (
    <section className="product-detail">
      <div className="product-detail-gallery">
        <Link className="back-link" href="/catalogo"><ArrowLeft size={16} /> Voltar ao catálogo</Link>
        <div className="product-main-image">
          {product.badge && <span className="product-badge">{product.badge}</span>}
          <img src={product.images[activeImage] || product.images[0]} alt={product.name} />
          {product.images.length > 1 && (
            <div className="gallery-count">{activeImage + 1} / {product.images.length}</div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="product-thumbnails">
            {product.images.map((image, index) => (
              <button className={index === activeImage ? "is-active" : ""} onClick={() => setActiveImage(index)} key={image} aria-label={`Ver imagem ${index + 1}`}>
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-detail-copy">
        <div className="product-breadcrumb"><span>{product.categoryName}</span><span>/</span><span>{product.eyebrow}</span></div>
        <h1>{product.name}</h1>
        <p className="product-lead">{product.shortDescription}</p>
        <div className="product-detail-price">
          {oldPrice && <div><span>De</span><del>{oldPrice}</del></div>}
          <strong>{price ?? product.priceLabel ?? "Valor sob consulta"}</strong>
          {price && <small>Consulte disponibilidade e condições.</small>}
        </div>
        <p className="product-description">{product.description}</p>
        <ul className="feature-list">
          {product.features.map((feature) => <li key={feature}><Check size={17} /> {feature}</li>)}
        </ul>
        <div className="product-actions">
          <a className="button button-whatsapp button-full" href={whatsappUrl(productWhatsAppMessage(product))} target="_blank" rel="noreferrer">
            <MessageCircle size={19} /> Tenho interesse <ArrowRight size={17} />
          </a>
          <button
            className={`button button-outline button-full ${selected ? "is-selected" : ""}`}
            onClick={() => !selected && add({ id: product.id, slug: product.slug, name: product.name, image: product.images[0] })}
          >
            {selected ? <><Check size={18} /> Já está na seleção</> : <><Plus size={18} /> Adicionar à seleção</>}
          </button>
        </div>
        <div className="product-assurance"><ShieldCheck size={20} /><p><strong>Atendimento antes da decisão.</strong> Tire dúvidas sobre medidas, acabamentos e uso diretamente com a equipe.</p></div>
      </div>
    </section>
  );
}

