import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { getPublicSnapshot } from "@/lib/server-data";
import { SITE_URL } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await getPublicSnapshot();
  const product = snapshot.products.find((item) => item.slug === slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription || product.description,
    openGraph: {
      title: `${product.name} | Rony Móveis`,
      description: product.shortDescription || product.description,
      images: product.images[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snapshot = await getPublicSnapshot();
  const product = snapshot.products.find((item) => item.slug === slug);
  if (!product) notFound();

  const related = snapshot.products
    .filter((item) => item.id !== product.id && item.categoryId === product.categoryId)
    .slice(0, 3);
  const image = product.images[0]?.startsWith("http") ? product.images[0] : `${SITE_URL}${product.images[0] || "/images/spaces/loja-rony.webp"}`;
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [image],
    description: product.description,
    category: product.categoryName,
    brand: { "@type": "Brand", name: "Rony Móveis" },
    ...(product.priceCents ? {
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: (product.priceCents / 100).toFixed(2),
        url: `${SITE_URL}/produto/${product.slug}`,
        availability: product.availability === "out_of_stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      },
    } : {}),
  };

  return (
    <main className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <ProductDetail product={product} />
      {related.length > 0 && (
        <section className="related-section section-pad">
          <div className="section-heading" data-reveal>
            <span className="eyebrow">Talvez combine com você</span>
            <h2>Continue explorando.</h2>
          </div>
          <div className="product-grid product-grid-three">
            {related.map((item, index) => <ProductCard product={item} index={index} key={item.id} />)}
          </div>
        </section>
      )}
    </main>
  );
}
