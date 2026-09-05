import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const admins = sqliteTable(
  "admins",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("admins_email_unique").on(table.email)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active").notNull().default(1),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_active_sort_idx").on(table.active, table.sortOrder),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    eyebrow: text("eyebrow").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    priceCents: integer("price_cents"),
    oldPriceCents: integer("old_price_cents"),
    priceLabel: text("price_label"),
    badge: text("badge"),
    featuresJson: text("features_json").notNull().default("[]"),
    active: integer("active").notNull().default(1),
    featured: integer("featured").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_active_sort_idx").on(table.active, table.sortOrder),
    index("products_featured_active_idx").on(table.featured, table.active),
    index("products_category_active_idx").on(table.categoryId, table.active),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    objectKey: text("object_key"),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("product_images_product_sort_idx").on(table.productId, table.sortOrder)],
);

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().default("hero"),
  eyebrow: text("eyebrow").notNull().default(""),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default("Ver catálogo"),
  ctaHref: text("cta_href").notNull().default("/catalogo"),
  imageUrl: text("image_url").notNull().default(""),
  objectKey: text("object_key"),
  active: integer("active").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quoteRequests = sqliteTable(
  "quote_requests",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    city: text("city").notNull().default("Goiânia"),
    projectType: text("project_type").notNull(),
    categoriesJson: text("categories_json").notNull().default("[]"),
    selectedProductsJson: text("selected_products_json").notNull().default("[]"),
    dimensions: text("dimensions").notNull().default(""),
    budget: text("budget").notNull().default(""),
    timeline: text("timeline").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("novo"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("quotes_status_created_idx").on(table.status, table.createdAt)],
);

export const quoteFiles = sqliteTable(
  "quote_files",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("quote_files_quote_idx").on(table.quoteId)],
);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
