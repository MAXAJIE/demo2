/**
 * GET /sitemap.xml — per-tenant sitemap, ported from backend/app/main.py.
 * One <url> per static page plus one per published offering; unknown hosts 404.
 */
import { sitemapXml } from "./lib/seo.ts";
import type { Bundle } from "./lib/seo.ts";

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

type Lookup<T> = { kind: "ok"; value: T } | { kind: "unknown" } | { kind: "error" };

const XML = "application/xml";

export const onRequest = async ({ request, env }: Context): Promise<Response> => {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
  const bundle = await callRpc<Bundle>(env, "site_bundle", { p_host: hostOf(request), p_slug: null });
  if (bundle.kind === "unknown") return body("Not Found\n", 404, method);
  if (bundle.kind === "error") return body("Service Unavailable\n", 503, method);
  const xml = sitemapXml(new URL(request.url).origin, bundle.value);
  return body(xml, 200, method);
};

function body(text: string, status: number, method: string): Response {
  return new Response(method === "HEAD" ? null : text, {
    status,
    headers: { "content-type": XML, "cache-control": "public, max-age=300" },
  });
}

function hostOf(request: Request): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).hostname;
}

/** `site_bundle` also proves the host resolves to an active tenant. */
async function callRpc<T>(env: Env, fn: string, requestBody: unknown): Promise<Lookup<T>> {
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
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) return { kind: "error" };
    const text = (await response.text()).trim();
    if (!text || text === "null") return { kind: "unknown" };
    return { kind: "ok", value: JSON.parse(text) as T };
  } catch {
    return { kind: "error" };
  }
}
