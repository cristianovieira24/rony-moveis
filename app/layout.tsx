import type { Metadata } from "next";
import { SelectionProvider } from "@/components/selection-provider";
import { SiteFrame } from "@/components/site-frame";
import { SITE_URL } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rony Móveis | Casa, escritório e planejados em Goiânia",
    template: "%s | Rony Móveis",
  },
  description:
    "Móveis para casa e escritório, cadeiras, poltronas, estofados e projetos planejados com atendimento em Goiânia.",
  keywords: [
    "móveis em Goiânia",
    "cadeiras de escritório",
    "móveis planejados",
    "poltronas",
    "Rony Móveis",
  ],
  openGraph: {
    title: "Rony Móveis",
    description: "Móveis para viver e trabalhar melhor, com atendimento próximo em Goiânia.",
    locale: "pt_BR",
    type: "website",
    images: ["/images/spaces/escritorio-planejado.webp"],
  },
  icons: {
    icon: "/brand/monograma.svg",
    shortcut: "/brand/monograma.svg",
  },
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <SelectionProvider>
          <SiteFrame>{children}</SiteFrame>
        </SelectionProvider>
      </body>
    </html>
  );
}
