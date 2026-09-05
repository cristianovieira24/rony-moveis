export type CategoryMeta = {
  slug: string;
  shortName: string;
  kicker: string;
  image: string;
  heroImage: string;
  examples: string[];
};

export const CATEGORY_META: CategoryMeta[] = [
  {
    slug: "poltronas",
    shortName: "Poltronas",
    kicker: "Conforto e presença",
    image: "/images/products/melfi.webp",
    heroImage: "/images/products/elizabeth.webp",
    examples: ["Giratórias", "Reclináveis", "Com massagem"],
  },
  {
    slug: "cadeiras",
    shortName: "Cadeiras",
    kicker: "Ergonomia para a rotina",
    image: "/images/spaces/cadeiras-escritorio.webp",
    heroImage: "/images/spaces/cadeiras-escritorio.webp",
    examples: ["Presidente", "Executiva", "Secretária e gamer"],
  },
  {
    slug: "escritorio",
    shortName: "Escritório",
    kicker: "Ambientes que trabalham melhor",
    image: "/images/spaces/mesa-escritorio.webp",
    heroImage: "/images/spaces/escritorio-planejado.webp",
    examples: ["Mesas", "Estações", "Armários e gaveteiros"],
  },
  {
    slug: "planejados",
    shortName: "Planejados",
    kicker: "Cada centímetro bem pensado",
    image: "/images/spaces/cozinha-madeira.webp",
    heroImage: "/images/spaces/cozinha-cobre.webp",
    examples: ["Cozinhas", "Quartos", "Casa e comércio"],
  },
  {
    slug: "estofados",
    shortName: "Estofados",
    kicker: "Conforto para receber e descansar",
    image: "/images/products/atlanta.webp",
    heroImage: "/images/products/louisiana.webp",
    examples: ["Sofás", "Poltronas", "Recepções"],
  },
  {
    slug: "moveis-de-aco",
    shortName: "Móveis de aço",
    kicker: "Organização resistente",
    image: "/images/spaces/loja-rony.webp",
    heroImage: "/images/spaces/loja-rony.webp",
    examples: ["Arquivos", "Armários", "Estantes e roupeiros"],
  },
];

export const CATEGORY_META_BY_SLUG = Object.fromEntries(
  CATEGORY_META.map((category) => [category.slug, category]),
) as Record<string, CategoryMeta>;
