/**
 * GET /robots.txt — per-tenant robots file, ported from backend/app/main.py.
 * Unknown hosts get a 404 (same as the Python backend) so wildcard/garbage hosts
 * are not told to crawl anything.
 */
import { robotsTxt } from "./lib/seo.ts";

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

type Lookup = { kind: "ok" } | { kind: "unknown" } | { kind: "error" };

const TEXT = "text/plain; charset=utf-8";

export const onRequest = async ({ request, env }: Context): Promise<Response> => {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
  const tenant = await resolveTenant(env, request);
  if (tenant.kind === "unknown") return body("Not Found\n", 404, method);
  if (tenant.kind === "error") return body("Service Unavailable\n", 503, method);
  return body(robotsTxt(new URL(request.url).origin), 200, method);
};

function body(text: string, status: number, method: string): Response {
  return new Response(method === "HEAD" ? null : text, {
    status,
    headers: { "content-type": TEXT, "cache-control": "public, max-age=300" },
  });
}

async function resolveTenant(env: Env, request: Request): Promise<Lookup> {
  const base = env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!base || !env.SUPABASE_ANON_KEY) return { kind: "error" };
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).hostname;
  try {
    const response = await fetch(`${base}/rest/v1/rpc/resolve_tenant_by_host`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ p_host: host }),
    });
    if (!response.ok) return { kind: "error" };
    const text = (await response.text()).trim();
    return !text || text === "null" ? { kind: "unknown" } : { kind: "ok" };
  } catch {
    return { kind: "error" };
  }
}
