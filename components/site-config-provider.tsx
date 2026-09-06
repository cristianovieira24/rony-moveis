"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SITE_SETTINGS } from "@/lib/catalog";
import type { SiteSettings } from "@/lib/types";

const SiteConfigContext = createContext<SiteSettings>(DEFAULT_SITE_SETTINGS);

export function SiteConfigProvider({ settings, children }: { settings: SiteSettings; children: React.ReactNode }) {
  return <SiteConfigContext.Provider value={settings}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

