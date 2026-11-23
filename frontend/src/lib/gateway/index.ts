import { ApiError } from "../errors";
import { restGateway } from "./rest";
import type { DataGateway } from "./types";

/**
 * The app talks to exactly one gateway.
 *
 *   rest  (default)  the existing FastAPI backend
 *   local            bundled seed + localStorage, no server at all
 *   supabase         hosted Postgres + auth (the production path)
 *
 * Selected at build time by VITE_DATA_SOURCE, never from user input. The local
 * and Supabase adapters are imported on demand so neither the 47 KB seed nor
 * supabase-js reaches a visitor of another mode.
 */
const requested = (import.meta.env.VITE_DATA_SOURCE ?? "").toLowerCase();

export const dataSource: "rest" | "local" | "supabase" =
  requested === "local" ? "local" : requested === "supabase" ? "supabase" : "rest";

let adapter: DataGateway = restGateway;
let pending: Promise<void> | null = null;
let activeTenant: string | null = null;

async function createSupabase(): Promise<DataGateway> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new ApiError(
      "Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)",
      500,
      "supabase_unconfigured",
    );
  }
  const [{ createSupabaseGateway }, { createClient }] = await Promise.all([
    import("./supabase"),
    import("@supabase/supabase-js"),
  ]);
  // The adapter only needs a structural subset of the client; casting avoids
  // instantiating supabase-js' deeply generic types here (TS2589).
  const client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  }) as unknown as Parameters<typeof createSupabaseGateway>[0];
  return createSupabaseGateway(client);
}

async function load(): Promise<DataGateway> {
  if (dataSource === "rest") return adapter;
  pending ??= (async () => {
    if (dataSource === "local") {
      const { createLocalGateway } = await import("./local");
      adapter = createLocalGateway();
    } else {
      adapter = await createSupabase();
    }
    adapter.setActiveTenant(activeTenant);
  })();
  await pending;
  return adapter;
}

export function setActiveTenant(slug: string | null): void {
  activeTenant = slug;
  adapter.setActiveTenant(slug);
}

export async function gateway(): Promise<DataGateway> {
  return load();
}
