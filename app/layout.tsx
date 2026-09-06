import type { Metadata } from "next";
import { SelectionProvider } from "@/components/selection-provider";
import { SiteFrame } from "@/components/site-frame";
import { SiteConfigProvider } from "@/components/site-config-provider";
import { SITE_URL } from "@/lib/catalog";
import { getSiteChromeData } from "@/lib/server-data";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteChromeData();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: settings.seoTitle, template: `%s | ${settings.businessName}` },
    description: settings.seoDescription,
    keywords: ["móveis em Goiânia", "cadeiras de escritório", "móveis planejados", "poltronas", "Rony Móveis"],
    openGraph: {
      title: settings.businessName,
      description: settings.seoDescription,
      locale: "pt_BR",
      type: "website",
      images: ["/images/spaces/escritorio-planejado.webp"],
    },
    icons: { icon: "/brand/monograma.svg", shortcut: "/brand/monograma.svg" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { categories, settings } = await getSiteChromeData();
  return (
    <html lang="pt-BR">
      <body>
        <SiteConfigProvider settings={settings}>
          <SelectionProvider>
            <SiteFrame categories={categories}>{children}</SiteFrame>
          </SelectionProvider>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
