import { DEFAULT_SITE_SETTINGS, seedCampaign, seedCategories, seedProducts } from "./catalog";
import type { Campaign, Category, Product, QuoteSummary, SiteSettings } from "./types";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { unstable_cache } from "next/cache";
import { cache } from "react";

export const PUBLIC_DATA_TAG = "rony-public-data";

type Statement = {
  query: string;
  values: unknown[];
  bind: (...values: unknown[]) => Statement;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

export type DatabaseBinding = {
  prepare: (query: string) => Statement;
  batch: (statements: Statement[]) => Promise<unknown>;
};

let sqlClient: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;
let seedPromise: Promise<void> | null = null;

function numberedPlaceholders(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não foi configurada.");
  sqlClient ??= neon(connectionString);
  return sqlClient;
}

function makeStatement(sql: NeonQueryFunction<false, false>, query: string, values: unknown[] = []): Statement {
  return {
    query,
    values,
    bind: (...nextValues) => makeStatement(sql, query, nextValues),
    all: async <T,>() => ({ results: (await sql.query(numberedPlaceholders(query), values)) as T[] }),
    first: async <T,>() => {
      const rows = (await sql.query(numberedPlaceholders(query), values)) as T[];
      return rows[0] ?? null;
    },
    run: async () => sql.query(numberedPlaceholders(query), values),
  };
}

async function ensureDatabaseSchema(sql: NeonQueryFunction<false, false>) {
  schemaPromise ??= (async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        eyebrow TEXT NOT NULL DEFAULT '', short_description TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '', category_id TEXT NOT NULL REFERENCES categories(id),
        price_cents INTEGER, old_price_cents INTEGER, price_label TEXT, badge TEXT,
        features_json TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1,
        featured INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        source_url TEXT NOT NULL, object_key TEXT, alt TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL UNIQUE, eyebrow TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', cta_label TEXT NOT NULL DEFAULT '',
        cta_href TEXT NOT NULL DEFAULT '/', image_url TEXT NOT NULL, object_key TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS quote_requests (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
        city TEXT NOT NULL, project_type TEXT NOT NULL, categories_json TEXT NOT NULL DEFAULT '[]',
        selected_products_json TEXT NOT NULL DEFAULT '[]', dimensions TEXT NOT NULL DEFAULT '',
        budget TEXT NOT NULL DEFAULT '', timeline TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'novo', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS quote_files (
        id TEXT PRIMARY KEY, quote_id TEXT NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
        object_key TEXT NOT NULL, filename TEXT NOT NULL, content_type TEXT NOT NULL,
        size INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS object_key TEXT",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS featured INTEGER NOT NULL DEFAULT 1",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_fit TEXT NOT NULL DEFAULT 'cover'",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS price_mode TEXT NOT NULL DEFAULT 'price'",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'available'",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS search_terms TEXT NOT NULL DEFAULT ''",
      "CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id)",
      "CREATE INDEX IF NOT EXISTS products_sort_idx ON products(active, sort_order)",
      "CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id, sort_order)",
      "CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id, sort_order)",
      "CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON quote_requests(status, created_at)",
    ];
    await sql.transaction(statements.map((statement) => sql.query(statement)));
  })();
  await schemaPromise;
}

export async function getDatabase(): Promise<DatabaseBinding> {
  const sql = getSqlClient();
  await ensureDatabaseSchema(sql);
  return {
    prepare: (query) => makeStatement(sql, query),
    batch: async (statements) => {
      if (!statements.length) return [];
      return sql.transaction(
        statements.map((statement) => sql.query(numberedPlaceholders(statement.query), statement.values)),
      );
    },
  };
}

async function prepareSeedData() {
  const db = await getDatabase();
  const marker = await db
    .prepare("SELECT value FROM site_settings WHERE key = ?")
    .bind("seed_version")
    .first<{ value: string }>();
  if (marker?.value === "3") return;

  const statements: Statement[] = [];
  for (const category of seedCategories) {
    statements.push(
      db
        .prepare(
          `INSERT INTO categories
           (id, slug, name, description, parent_id, image_url, image_fit, featured, sort_order, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`,
        )
        .bind(
          category.id,
          category.slug,
          category.name,
          category.description,
          category.parentId,
          category.imageUrl,
          category.imageFit,
          category.featured ? 1 : 0,
          category.sortOrder,
          category.active ? 1 : 0,
        ),
    );
    statements.push(
      db
        .prepare(
          `UPDATE categories SET image_url = CASE WHEN image_url = '' THEN ? ELSE image_url END,
           image_fit = ?, featured = COALESCE(featured, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
        .bind(category.imageUrl, category.imageFit, category.featured ? 1 : 0, category.id),
    );
  }

  const categoryImageMigrations = [
    ["cat-presidente", "/images/spaces/cadeiras-escritorio.webp", "/images/legacy-chairs/presidente-01.webp"],
    ["cat-executiva", "/images/spaces/mesa-escritorio.webp", "/images/legacy-chairs/executiva-01.webp"],
    ["cat-diretor", "/images/spaces/escritorio-planejado.webp", "/images/legacy-chairs/diretor-01.webp"],
    ["cat-secretaria", "/images/spaces/cadeiras-escritorio.webp", "/images/legacy-chairs/secretaria-01.webp"],
  ] as const;
  for (const [id, previousImage, nextImage] of categoryImageMigrations) {
    statements.push(
      db.prepare("UPDATE categories SET image_url = ?, image_fit = 'contain', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND image_url = ?")
        .bind(nextImage, id, previousImage),
    );
  }

  for (const product of seedProducts) {
    statements.push(
      db
        .prepare(
          `INSERT INTO products
           (id, slug, name, eyebrow, short_description, description, category_id,
            price_cents, old_price_cents, price_label, price_mode, availability,
            search_terms, badge, features_json, active, featured, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`,
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
          product.priceMode,
          product.availability,
          product.searchTerms,
          product.badge,
          JSON.stringify(product.features),
          product.active ? 1 : 0,
          product.featured ? 1 : 0,
          product.sortOrder,
        ),
    );
    statements.push(
      db
        .prepare(
          `UPDATE products SET price_mode = ?, availability = ?, search_terms = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND search_terms = ''`,
        )
        .bind(product.priceMode, product.availability, product.searchTerms, product.id),
    );

    product.images.forEach((image, imageIndex) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO product_images
             (id, product_id, source_url, object_key, alt, sort_order)
             VALUES (?, ?, ?, NULL, ?, ?)
             ON CONFLICT(id) DO NOTHING`,
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
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO NOTHING`,
      )
      .bind("store_profile", JSON.stringify(DEFAULT_SITE_SETTINGS)),
  );
  statements.push(
    db
      .prepare(
        `INSERT INTO campaigns
         (id, kind, eyebrow, title, description, cta_label, cta_href, image_url, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
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
      .bind("seed_version", "3"),
  );

  await db.batch(statements);
}

export async function ensureSeedData() {
  seedPromise ??= prepareSeedData().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
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
  price_mode: Product["priceMode"];
  availability: Product["availability"];
  search_terms: string;
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
    priceMode: ["price", "from", "consult", "custom"].includes(row.price_mode) ? row.price_mode : "price",
    availability: ["available", "order", "made_to_order", "out_of_stock"].includes(row.availability) ? row.availability : "available",
    searchTerms: row.search_terms,
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
  const where = options?.includeInactive ? "" : "WHERE p.active = 1 AND c.active = 1";
  const [productResult, imageResult] = await Promise.all([
    db.prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.sort_order ASC, p.created_at DESC`,
    ).all<ProductRow>(),
    db.prepare("SELECT * FROM product_images ORDER BY sort_order ASC").all<ImageRow>(),
  ]);
  return mapProducts(productResult.results ?? [], imageResult.results ?? []);
}

export async function getProductBySlug(slug: string) {
  const products = await getProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getCategories(options?: { includeInactive?: boolean }) {
  await ensureSeedData();
  const db = await getDatabase();
  const result = await db
    .prepare(
      `SELECT c.id, c.slug, c.name, c.description, c.parent_id, p.name AS parent_name,
              c.image_url, c.image_fit, c.active, c.featured, c.sort_order
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       ${options?.includeInactive ? "" : "WHERE c.active = 1"}
       ORDER BY c.sort_order ASC, c.name ASC`,
    )
    .all<{
      id: string;
      slug: string;
      name: string;
      description: string;
      parent_id: string | null;
      parent_name: string | null;
      image_url: string;
      image_fit: string;
      active: number;
      featured: number;
      sort_order: number;
    }>();
  return (result.results ?? []).map<Category>((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    parentId: row.parent_id,
    parentName: row.parent_name,
    imageUrl: row.image_url,
    imageFit: row.image_fit === "contain" ? "contain" : "cover",
    active: row.active === 1,
    featured: row.featured === 1,
    sortOrder: row.sort_order,
  }));
}

function parseSiteSettings(value: string | undefined | null): SiteSettings {
  if (!value) return DEFAULT_SITE_SETTINGS;
  try {
    const parsed = JSON.parse(value) as Partial<SiteSettings>;
    return { ...DEFAULT_SITE_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function getSiteSettings() {
  await ensureSeedData();
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT value FROM site_settings WHERE key = ?")
    .bind("store_profile")
    .first<{ value: string }>();
  return parseSiteSettings(row?.value);
}

export async function getCampaign() {
  await ensureSeedData();
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM campaigns WHERE kind = ? LIMIT 1")
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

async function readPublicSnapshot() {
  const [products, categories, campaign, settings] = await Promise.all([
    getProducts(),
    getCategories(),
    getCampaign(),
    getSiteSettings(),
  ]);
  return { products, categories, campaign, settings, connected: true };
}

const readCachedPublicSnapshot = unstable_cache(readPublicSnapshot, ["rony-public-snapshot-v3"], {
  revalidate: 3600,
  tags: [PUBLIC_DATA_TAG],
});

export const getPublicSnapshot = cache(async () => {
  try {
    return await readCachedPublicSnapshot();
  } catch (error) {
    console.error("Falha ao carregar o catálogo persistido", error);
    return {
      products: seedProducts,
      categories: seedCategories,
      campaign: seedCampaign,
      settings: DEFAULT_SITE_SETTINGS,
      connected: false,
    };
  }
});

export async function getSiteChromeData() {
  const { categories, settings } = await getPublicSnapshot();
  return { categories, settings };
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
    list.push({ url: file.object_key, filename: file.filename });
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
