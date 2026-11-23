/**
 * Cloudflare Pages catch-all for the SPA: serves index.html with the tenant's
 * <head>, the inline __SITE__ bootstrap and a real 404 status for unknown routes.
 * GET and HEAD only.
 *
 * This replaces the FastAPI SPA fallback in backend/app/main.py; the HTML rules
 * themselves live in ./lib/seo.ts (ported from backend/app/seo.py).
 */
import { isKnownPath, renderHead } from "./lib/seo.ts";
import type { Bundle } from "./lib/seo.ts";

/** Minimal shapes, so the Functions bundle needs no @cloudflare/workers-types. */
interface Fetcher {
  fetch(input: Request | URL | string): Promise<Response>;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ASSETS: Fetcher;
}

interface Context {
  request: Request;
  env: Env;
}

interface Tenant {
  id: string;
  slug: string;
}

/** A lookup either found the tenant, proved the host is unknown, or failed. */
type Lookup<T> = { kind: "ok"; value: T } | { kind: "unknown" } | { kind: "error" };

/** Files Pages serves itself; a misconfigured _routes.json must not 404 them. */
const FILE_EXTENSION =
  /\.(?:html?|js|mjs|css|map|json|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|txt|xml|webmanifest)$/i;

export const onRequest = async ({ request, env }: Context): Promise<Response> => {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(request.url);
  if (FILE_EXTENSION.test(url.pathname)) return env.ASSETS.fetch(request);

  const host = hostOf(request);
  // The shell is needed for every outcome (including a 404 for an unknown host),
  // so it is fetched in parallel with the tenant lookup.
  const [shell, tenant] = await Promise.all([fetchShell(env, request), resolveTenant(env, host)]);

  if (!shell) return new Response("Not Found", { status: 404 });
  // Unknown host: the shell still loads and the client shows its "unknown tenant"
  // screen — the same 404-with-HTML the Python backend returned.
  if (tenant.kind === "unknown") return page(shell, 404, method, url.pathname);
  // A data problem must never turn the page into a 500: serve the plain shell and
  // let the client show its own error state (mirrors the Python fallback).
  if (tenant.kind === "error") return page(shell, 200, method, url.pathname);

  const bundle = await fetchBundle(env, host);
  if (bundle.kind !== "ok") return page(shell, 200, method, url.pathname);

  try {
    const rendered = renderHead(shell, bundle.value, url.origin, url.pathname);
    const status = isKnownPath(url.pathname, bundle.value) ? 200 : 404;
    return page(rendered, status, method, url.pathname);
  } catch {
    return page(shell, 200, method, url.pathname);
  }
};

function hostOf(request: Request): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).hostname;
}

/** A HEAD response keeps the headers but must not carry a body. */
function page(body: string, status: number, method: string, path: string): Response {
  const headers: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
    // The HTML differs per tenant, so shared caches must key on the host.
    vary: "Host, X-Forwarded-Host",
    "cache-control": "no-cache",
    "x-content-type-options": "nosniff",
  };
  if (path.startsWith("/manage")) headers["x-robots-tag"] = "noindex, nofollow";
  return new Response(method === "HEAD" ? null : body, { status, headers });
}

/** The SPA shell itself. Read from /index.html rather than the request path, so the
 * result does not depend on Pages' not_found_handling setting. */
async function fetchShell(env: Env, request: Request): Promise<string | null> {
  try {
    const response = await env.ASSETS.fetch(new URL("/index.html", request.url));
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

function resolveTenant(env: Env, host: string): Promise<Lookup<Tenant>> {
  return callRpc<Tenant>(env, "resolve_tenant_by_host", { p_host: host });
}

function fetchBundle(env: Env, host: string): Promise<Lookup<Bundle>> {
  return callRpc<Bundle>(env, "site_bundle", { p_host: host, p_slug: null });
}

/**
 * POST an RPC over PostgREST with the anon key. A missing row is `unknown`; a
 * network or HTTP failure is `error`, so the caller can tell the two apart.
 */
async function callRpc<T>(env: Env, fn: string, body: unknown): Promise<Lookup<T>> {
  const base = env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!base || !env.SUPABASE_ANON_KEY) return { kind: "error" };
  try {
    const response = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return { kind: "error" };
    const text = (await response.text()).trim();
    if (!text || text === "null") return { kind: "unknown" };
    return { kind: "ok", value: JSON.parse(text) as T };
  } catch {
    return { kind: "error" };
  }
}
