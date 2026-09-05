"use client";

import { usePathname } from "next/navigation";
import { PageMotion } from "./page-motion";
import { SiteFooter, SiteHeader } from "./site-shell";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;
  return (
    <>
      <PageMotion />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}

