import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

import "../index.css";
import "./admin.css";
import "../lib/i18n";
import { TenantProvider } from "../app/TenantProvider";
import { AdminApp } from "./AdminApp";

/**
 * Workspace = the tenant this backstage session works on. It comes from the URL
 * once (?workspace=slug), is remembered in localStorage, and can be seeded by
 * VITE_ADMIN_TENANT for a single-tenant deployment. The tenant bundle is loaded
 * for that slug so the console keeps the tenant's language and branding.
 */
const WORKSPACE_KEY = "coresite.workspace";
const TENANT_KEY = "coresite.tenant";

function resolveWorkspace(): string | null {
  const fallback = import.meta.env.VITE_ADMIN_TENANT ?? null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("workspace");
    if (fromUrl) localStorage.setItem(WORKSPACE_KEY, fromUrl);
    return localStorage.getItem(WORKSPACE_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

const workspace = resolveWorkspace();
if (workspace) {
  try {
    sessionStorage.setItem(TENANT_KEY, workspace);
  } catch {
    // Private mode: TenantProvider falls back to its own resolution.
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing backstage root");

createRoot(rootElement).render(
  <StrictMode>
    <div className="backstage min-h-screen">
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TenantProvider>
              <AdminApp />
            </TenantProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </div>
  </StrictMode>,
);
