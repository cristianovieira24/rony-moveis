import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/catalog";
import { getPublicSnapshot } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await getPublicSnapshot();
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/catalogo`, lastModified: now, changeFrequency: "weekly", priority: .9 },
    { url: `${SITE_URL}/orcamento`, lastModified: now, changeFrequency: "monthly", priority: .8 },
    { url: `${SITE_URL}/contato`, lastModified: now, changeFrequency: "monthly", priority: .8 },
    ...categories.map((category) => ({
      url: `${SITE_URL}/categoria/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: .8,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/produto/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: .7,
    })),
  ];
}
