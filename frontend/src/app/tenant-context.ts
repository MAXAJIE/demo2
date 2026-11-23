import { createContext, useContext } from "react";

import type { I18nText, Locale, SiteBundle, SiteLabels } from "../types";

export type TenantContextValue = {
  bundle: SiteBundle;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: I18nText | undefined, fallback?: string) => string;
  label: (key: keyof SiteLabels, fallback: string) => string;
  tenantParam: string | null;
  refresh: () => void;
};

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used inside TenantProvider");
  return context;
}
