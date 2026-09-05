export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

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
  badge: string | null;
  features: string[];
  images: string[];
  active: boolean;
  featured: boolean;
  sortOrder: number;
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
