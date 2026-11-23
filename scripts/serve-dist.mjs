#!/usr/bin/env node
/**
 * Serve a built SPA locally with history fallback — stand-in for Cloudflare Pages
 * when working offline. This is a file server for development only: the product
 * itself is static files, so any static host (Pages, Netlify, nginx) can replace it.
 *
 *   node scripts/serve-dist.mjs [dir] [port]
 *   node scripts/serve-dist.mjs frontend/dist 8011
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "frontend/dist");
const port = Number(process.argv[3] ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

if (!existsSync(join(root, "index.html"))) {
  console.error(`No index.html in ${root}. Run "npm run build" in frontend/ first.`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  // Never let a path escape the build directory.
  const candidate = normalize(join(root, pathname));
  const isInside = candidate === root || candidate.startsWith(root + "\\") || candidate.startsWith(root + "/");
  const file = isInside && existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : join(root, "index.html");

  const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  const immutable = pathname.startsWith("/assets/");
  const headers = {
    "content-type": type,
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    "x-content-type-options": "nosniff",
  };

  if (req.method === "HEAD") {
    res.writeHead(200, headers);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405, { allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} on http://127.0.0.1:${port} (SPA fallback on)`);
});
