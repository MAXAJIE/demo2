import { restGateway } from "./rest";
import type { DataGateway } from "./types";

/**
 * The app talks to exactly one gateway.
 *
 *   rest  (default)  the existing FastAPI backend
 *   local            bundled seed + localStorage, no server at all
 *   supabase         the hosted Postgres path (lands with the Supabase adapter)
 *
 * Selected at build time by VITE_DATA_SOURCE, never from user input.
 *
 * The local adapter is imported on demand so its seed bundle (~47 KB) never
 * reaches a visitor of the rest or supabase build.
 */
const requested = (import.meta.env.VITE_DATA_SOURCE ?? "").toLowerCase();

export const dataSource: "rest" | "local" = requested === "local" ? "local" : "rest";

let adapter: DataGateway = restGateway;
let pendingLocal: Promise<void> | null = null;
let activeTenant: string | null = null;

async function load(): Promise<DataGateway> {
  if (dataSource !== "local") return adapter;
  pendingLocal ??= import("./local").then(({ createLocalGateway }) => {
    adapter = createLocalGateway();
    adapter.setActiveTenant(activeTenant);
  });
  await pendingLocal;
  return adapter;
}

export function setActiveTenant(slug: string | null): void {
  activeTenant = slug;
  adapter.setActiveTenant(slug);
}

export async function gateway(): Promise<DataGateway> {
  return load();
}
