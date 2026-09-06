"use client";

import { usePathname } from "next/navigation";
import { PageMotion } from "./page-motion";
import { SiteFooter, SiteHeader } from "./site-shell";
import type { Category } from "@/lib/types";
import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";
import { useSiteConfig } from "./site-config-provider";

export function SiteFrame({ children, categories }: { children: React.ReactNode; categories: Category[] }) {
  const pathname = usePathname();
  const settings = useSiteConfig();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;
  return (
    <>
      <PageMotion />
      <SiteHeader categories={categories} />
      {children}
      <SiteFooter categories={categories} />
      <a className="floating-whatsapp" href={whatsappUrl("Olá, Rony Móveis! Vim pelo site e gostaria de atendimento.", settings.whatsappNumber)} target="_blank" rel="noreferrer" aria-label="Falar com a Rony Móveis no WhatsApp"><MessageCircle size={22} /><span>Fale com a gente</span></a>
    </>
  );
}
