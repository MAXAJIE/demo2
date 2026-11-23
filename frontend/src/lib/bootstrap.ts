import type { SiteBundle } from "../types";

type DocLike = Pick<Document, "getElementById">;

/**
 * The server inlines the site bundle as <script id="__SITE__" type="application/json">.
 * Returns it only when it belongs to the tenant this browser is asking for, so the
 * first render needs no extra /api/v1/site request.
 */
export function readBootstrap(
  tenantParam: string | null,
  doc: DocLike = document,
): SiteBundle | undefined {
  try {
    const raw = doc.getElementById("__SITE__")?.textContent;
    if (!raw) return undefined;
    const bundle = JSON.parse(raw) as SiteBundle;
    if (!bundle?.tenant?.slug) return undefined;
    return tenantParam === null || tenantParam === bundle.tenant.slug ? bundle : undefined;
  } catch {
    return undefined;
  }
}
