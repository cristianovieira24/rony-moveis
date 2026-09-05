import { seedCampaign, seedCategories, seedProducts } from "./catalog";
import type { Campaign, Category, Product, QuoteSummary } from "./types";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

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
      "CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id)",
      "CREATE INDEX IF NOT EXISTS products_sort_idx ON products(active, sort_order)",
      "CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id, sort_order)",
      "CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON quote_requests(status, created_at)",
    ];
    for (const statement of statements) await sql.query(statement);
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
          `INSERT INTO categories
           (id, slug, name, description, sort_order, active)
           VALUES (?, ?, ?, ?, ?, 1)
           ON CONFLICT(id) DO NOTHING`,
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
          `INSERT INTO products
           (id, slug, name, eyebrow, short_description, description, category_id,
            price_cents, old_price_cents, price_label, badge, features_json,
            active, featured, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
