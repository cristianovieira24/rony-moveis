import { SITE_URL, WHATSAPP_NUMBER } from "./catalog";
import type { Product } from "./types";

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppMessage(product: Pick<Product, "name" | "slug">) {
  return `Olá, Rony Móveis! Vi o produto “${product.name}” no site e gostaria de saber disponibilidade, opções e condições. Produto: ${SITE_URL}/produto/${product.slug}`;
}
