import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { getPublicSnapshot } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snapshot = await getPublicSnapshot();
  const product = snapshot.products.find((item) => item.slug === slug);
  if (!product) notFound();

  const related = snapshot.products
    .filter((item) => item.id !== product.id && item.categoryId === product.categoryId)
    .slice(0, 3);

  return (
    <main className="product-page">
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

