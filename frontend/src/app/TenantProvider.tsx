import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TenantContext, type TenantContextValue } from "./tenant-context";

import i18n from "../lib/i18n";
import { fetchSite, setActiveTenant } from "../lib/api";
import { readBootstrap } from "../lib/bootstrap";
import { SiteSkeleton } from "../components/site/Skeletons";
import { text } from "../lib/utils";
import type { Locale, SiteBundle } from "../types";

const TENANT_KEY = "coresite.tenant";
const LOCALE_KEY = "coresite.locale";

function initialTenant(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("tenant");
    if (fromQuery) {
      sessionStorage.setItem(TENANT_KEY, fromQuery);
      return fromQuery;
    }
    return sessionStorage.getItem(TENANT_KEY);
  } catch {
    return null;
  }
}

function initialLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "zh") {
      localStorage.setItem(LOCALE_KEY, "ms");
      return "ms";
    }
    return stored === "ms" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
}

function applyTheme(bundle: SiteBundle): void {
  const root = document.documentElement;
  const tokens = bundle.site.theme.tokens;
  root.style.setProperty("--bg", tokens.bg);
  root.style.setProperty("--surface", tokens.surface);
  root.style.setProperty("--surface-2", tokens.surface2);
  root.style.setProperty("--text", tokens.text);
  root.style.setProperty("--text-muted", tokens.muted);
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--on-primary", tokens.onPrimary);
  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--border", tokens.border);
  root.style.setProperty("--ring", tokens.ring);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { t: translate } = useTranslation();
  const [tenantParam] = useState(initialTenant);
  const [locale, setLocaleState] = useState<Locale>(initialLocale() ?? "en");

  const [bootstrap] = useState(() => readBootstrap(tenantParam));

  const query = useQuery({
    queryKey: ["tenant", tenantParam],
    queryFn: () => fetchSite(tenantParam),
    initialData: bootstrap,
    initialDataUpdatedAt: bootstrap ? Date.now() : undefined,
    retry: 1,
    staleTime: 30_000,
  });

  const bundle = query.data;

  useEffect(() => {
    if (!bundle) return;
    setActiveTenant(bundle.tenant.slug);
    applyTheme(bundle);
    const allowed = bundle.site.locales ?? ["en"];
    const stored = initialLocale();
    const next = stored && allowed.includes(stored) ? stored : bundle.site.default_locale;
    setLocaleState(next);
    void i18n.changeLanguage(next);
    document.documentElement.lang = next === "zh" ? "zh-Hans" : next === "ms" ? "ms" : "en";
  }, [bundle]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void i18n.changeLanguage(next);
    document.documentElement.lang = next === "zh" ? "zh-Hans" : next === "ms" ? "ms" : "en";
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // Preference is best-effort.
    }
  }, []);

  const value = useMemo<TenantContextValue | null>(() => {
    if (!bundle) return null;
    const activeLocale = (bundle.site.locales ?? ["en"]).includes(locale)
      ? locale
      : bundle.site.default_locale;
    return {
      bundle,
      locale: activeLocale,
      setLocale,
      t: (input, fallback = "") => text(input, activeLocale, fallback),
      label: (key, fallback) => text(bundle.site.labels?.[key], activeLocale, fallback),
      tenantParam,
      refresh: () => void query.refetch(),
    };
  }, [bundle, locale, query, setLocale, tenantParam]);

  if (query.isLoading) {
    return <SiteSkeleton />;
  }

  if (query.isError || !bundle || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-6">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center">
          <p className="eyebrow text-muted">404</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
            {translate("errors.unknownTenant")}
          </h1>
          <p className="mt-3 text-sm text-muted">{translate("common.errorBody")}</p>
          <button className="btn btn-primary mt-6 w-full" onClick={() => void query.refetch()}>
            {translate("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
