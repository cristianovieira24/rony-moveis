export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  imageUrl: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
};

export type PriceMode = "price" | "from" | "consult" | "custom";
export type ProductAvailability = "available" | "order" | "made_to_order" | "out_of_stock";

export type Product = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  priceCents: number | null;
  oldPriceCents: number | null;
  priceLabel: string | null;
  priceMode: PriceMode;
  availability: ProductAvailability;
  searchTerms: string;
  badge: string | null;
  features: string[];
  images: string[];
  active: boolean;
  featured: boolean;
  sortOrder: number;
};

export type SiteSettings = {
  businessName: string;
  tagline: string;
  announcement: string;
  whatsappNumber: string;
  phone: string;
  email: string;
  instagramUrl: string;
  address: string;
  shortAddress: string;
  mapUrl: string;
  openingHours: string;
  seoTitle: string;
  seoDescription: string;
};

export type Campaign = {
  id: string;
  kind: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  active: boolean;
};

export type QuoteSummary = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  projectType: string;
  categories: string[];
  selectedProducts: { name: string; slug: string; quantity: number }[];
  dimensions: string;
  budget: string;
  timeline: string;
  notes: string;
  files: { url: string; filename: string }[];
  status: string;
  createdAt: string;
};
