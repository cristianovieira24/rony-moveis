import { seedCampaign, seedCategories, seedProducts } from "./catalog";
import type { Campaign, Category, Product, QuoteSummary } from "./types";

type Statement = {
  bind: (...values: unknown[]) => Statement;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

export type DatabaseBinding = {
  prepare: (query: string) => Statement;
  batch: (statements: Statement[]) => Promise<unknown>;
};

export type BucketBinding = {
  put: (
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (key: string) => Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
    writeHttpMetadata?: (headers: Headers) => void;
  } | null>;
  delete: (key: string) => Promise<unknown>;
};

async function getRuntimeEnvironment() {
  const runtime = await import("cloudflare:workers");
  return runtime.env as unknown as {
    DB?: DatabaseBinding;
    BUCKET?: BucketBinding;
  };
}

export async function getDatabase(): Promise<DatabaseBinding> {
  const binding = (await getRuntimeEnvironment()).DB;
  if (!binding) throw new Error("O banco de dados do site não está disponível.");
  return binding;
}

export async function getBucket(): Promise<BucketBinding> {
  const binding = (await getRuntimeEnvironment()).BUCKET;
  if (!binding) throw new Error("O armazenamento de imagens não está disponível.");
  return binding;
}

export async function ensureSeedData() {
  const db = await getDatabase();
  const marker = await db
    .prepare("SELECT value FROM site_settings WHERE key = ?")
    .bind("seed_version")
    .first<{ value: string }>();
  if (marker?.value === "1") return;

  const statements: Statement[] = [];
  for (const category of seedCategories) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO categories
           (id, slug, name, description, sort_order, active)
           VALUES (?, ?, ?, ?, ?, 1)`,
        )
        .bind(
          category.id,
          category.slug,
          category.name,
          category.description,
          category.sortOrder,
        ),
    );
  }

  for (const product of seedProducts) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO products
           (id, slug, name, eyebrow, short_description, description, category_id,
            price_cents, old_price_cents, price_label, badge, features_json,
            active, featured, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          product.id,
          product.slug,
          product.name,
          product.eyebrow,
          product.shortDescription,
          product.description,
          product.categoryId,
          product.priceCents,
          product.oldPriceCents,
          product.priceLabel,
          product.badge,
          JSON.stringify(product.features),
          product.active ? 1 : 0,
          product.featured ? 1 : 0,
          product.sortOrder,
        ),
    );

    product.images.forEach((image, imageIndex) => {
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO product_images
             (id, product_id, source_url, object_key, alt, sort_order)
             VALUES (?, ?, ?, NULL, ?, ?)`,
          )
          .bind(
            `${product.id}-image-${imageIndex + 1}`,
            product.id,
            image,
            product.name,
            imageIndex,
          ),
      );
    });
  }

  statements.push(
    db
      .prepare(
        `INSERT OR IGNORE INTO campaigns
         (id, kind, eyebrow, title, description, cta_label, cta_href, image_url, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        seedCampaign.id,
        seedCampaign.kind,
        seedCampaign.eyebrow,
        seedCampaign.title,
        seedCampaign.description,
        seedCampaign.ctaLabel,
        seedCampaign.ctaHref,
        seedCampaign.imageUrl,
        seedCampaign.active ? 1 : 0,
      ),
  );
  statements.push(
    db
      .prepare(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      )
      .bind("seed_version", "1"),
  );

  await db.batch(statements);
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  short_description: string;
  description: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  price_cents: number | null;
  old_price_cents: number | null;
  price_label: string | null;
  badge: string | null;
  features_json: string;
  active: number;
  featured: number;
  sort_order: number;
};

type ImageRow = {
  id: string;
  product_id: string;
  source_url: string;
  object_key: string | null;
  alt: string;
  sort_order: number;
};

function parseFeatures(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapProducts(rows: ProductRow[], imageRows: ImageRow[]) {
  const byProduct = new Map<string, ImageRow[]>();
  for (const image of imageRows) {
    const list = byProduct.get(image.product_id) ?? [];
    list.push(image);
    byProduct.set(image.product_id, list);
  }

  return rows.map<Product>((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    eyebrow: row.eyebrow,
    shortDescription: row.short_description,
    description: row.description,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    priceCents: row.price_cents,
    oldPriceCents: row.old_price_cents,
    priceLabel: row.price_label,
    badge: row.badge,
    features: parseFeatures(row.features_json),
    images: (byProduct.get(row.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.source_url),
    active: row.active === 1,
    featured: row.featured === 1,
    sortOrder: row.sort_order,
  }));
}

export async function getProducts(options?: { includeInactive?: boolean }) {
  await ensureSeedData();
  const db = await getDatabase();
  const where = options?.includeInactive ? "" : "WHERE p.active = 1";
  const productResult = await db.prepare(
    `SELECT p.*, c.slug AS category_slug, c.name AS category_name
     FROM products p
     JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY p.sort_order ASC, p.created_at DESC`,
  ).all<ProductRow>();
  const imageResult = await db
    .prepare("SELECT * FROM product_images ORDER BY sort_order ASC")
    .all<ImageRow>();
  return mapProducts(productResult.results ?? [], imageResult.results ?? []);
}

export async function getProductBySlug(slug: string) {
  const products = await getProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getCategories() {
  await ensureSeedData();
  const db = await getDatabase();
  const result = await db
    .prepare(
      `SELECT id, slug, name, description, sort_order
       FROM categories WHERE active = 1 ORDER BY sort_order ASC`,
    )
    .all<{
      id: string;
      slug: string;
      name: string;
      description: string;
      sort_order: number;
    }>();
  return (result.results ?? []).map<Category>((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
  }));
}

export async function getCampaign() {
  await ensureSeedData();
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM campaigns WHERE kind = ? AND active = 1 LIMIT 1")
    .bind("hero")
    .first<{
      id: string;
      kind: string;
      eyebrow: string;
      title: string;
      description: string;
      cta_label: string;
      cta_href: string;
      image_url: string;
      active: number;
    }>();
  if (!row) return seedCampaign;
  return {
    id: row.id,
    kind: row.kind,
    eyebrow: row.eyebrow,
    title: row.title,
    description: row.description,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    imageUrl: row.image_url,
    active: row.active === 1,
  } satisfies Campaign;
}

export async function getPublicSnapshot() {
  try {
    const [products, categories, campaign] = await Promise.all([
      getProducts(),
      getCategories(),
      getCampaign(),
    ]);
    return { products, categories, campaign, connected: true };
  } catch (error) {
    console.error("Falha ao carregar o catálogo persistido", error);
    return {
      products: seedProducts,
      categories: seedCategories,
      campaign: seedCampaign,
      connected: false,
    };
  }
}

export async function getAdminQuotes() {
  const db = await getDatabase();
  const result = await db
    .prepare(
      `SELECT id, name, phone, email, city, project_type, categories_json,
              selected_products_json, dimensions, budget, timeline, notes, status, created_at
       FROM quote_requests ORDER BY created_at DESC LIMIT 100`,
    )
    .all<{
      id: string;
      name: string;
      phone: string;
      email: string | null;
      city: string;
      project_type: string;
      categories_json: string;
      selected_products_json: string;
      dimensions: string;
      budget: string;
      timeline: string;
      notes: string;
      status: string;
      created_at: string;
    }>();
  const files = await db
    .prepare("SELECT quote_id, object_key, filename FROM quote_files ORDER BY created_at ASC")
    .all<{ quote_id: string; object_key: string; filename: string }>();
  const filesByQuote = new Map<string, { url: string; filename: string }[]>();
  for (const file of files.results ?? []) {
    const list = filesByQuote.get(file.quote_id) ?? [];
    list.push({ url: `/api/media/${file.object_key}`, filename: file.filename });
    filesByQuote.set(file.quote_id, list);
  }
  const parseArray = <T,>(value: string): T[] => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return (result.results ?? []).map<QuoteSummary>((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    projectType: row.project_type,
    categories: parseArray<string>(row.categories_json),
    selectedProducts: parseArray<{ name: string; slug: string; quantity: number }>(row.selected_products_json),
    dimensions: row.dimensions,
    budget: row.budget,
    timeline: row.timeline,
    notes: row.notes,
    files: filesByQuote.get(row.id) ?? [],
    status: row.status,
    createdAt: row.created_at,
  }));
}
