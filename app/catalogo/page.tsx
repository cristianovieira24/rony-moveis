import { CatalogExplorer } from "@/components/catalog-explorer";
import { getPublicSnapshot } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Produtos | Rony Móveis",
  description: "Conheça cadeiras, poltronas, móveis para escritório, estofados e planejados da Rony Móveis em Goiânia.",
};

export default async function CatalogPage() {
  const snapshot = await getPublicSnapshot();
  return <CatalogExplorer products={snapshot.products} categories={snapshot.categories} />;
}

