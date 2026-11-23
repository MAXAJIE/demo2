#!/usr/bin/env node
/**
 * Vite emits the backstage entry as dist-admin/admin.html because the tenant
 * site already owns index.html. A Pages project serves index.html at the root,
 * so copy it after the build.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, "..", "frontend", "dist-admin");
const from = resolve(dir, "admin.html");
const to = resolve(dir, "index.html");

if (!existsSync(from)) {
  console.error(`Missing ${from}; run the backstage build first`);
  process.exit(1);
}
copyFileSync(from, to);
console.log(`Wrote ${to}`);
