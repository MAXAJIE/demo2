#!/usr/bin/env node
/**
 * Snapshot the live public site bundle into a static JSON file.
 *
 * The local data adapter (frontend/src/lib/gateway/local.ts) imports this file,
 * so the SPA can run with no backend. Re-run this script whenever seed content
 * changes on the backend.
 *
 * Usage:
 *   node scripts/dump-bundle.mjs
 *   SITE_URL=http://127.0.0.1:8011/api/v1/site node scripts/dump-bundle.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteUrl = process.env.SITE_URL ?? "http://127.0.0.1:8011/api/v1/site";
const target = resolve(here, "..", "content", "setapak.bundle.json");

const response = await fetch(siteUrl, { headers: { accept: "application/json" } });
if (!response.ok) {
  console.error(`GET ${siteUrl} failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}
const bundle = await response.json();

if (!bundle?.tenant?.slug || !bundle?.site) {
  console.error("Response does not look like a site bundle (missing tenant/site)");
  process.exit(1);
}

await mkdir(dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

const offeringCount = Array.isArray(bundle.offerings) ? bundle.offerings.length : 0;
const faqCount = Array.isArray(bundle.faq) ? bundle.faq.length : 0;
console.log(
  `Wrote ${target} (tenant=${bundle.tenant.slug}, offerings=${offeringCount}, faq=${faqCount})`,
);
