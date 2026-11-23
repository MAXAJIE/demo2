/**
 * Per-tenant HTML head, robots.txt and sitemap.xml — the frontend-only (Cloudflare
 * Pages Functions) port of backend/app/seo.py.
 *
 * Pure and dependency-free: no fetch, no runtime bindings, no Node APIs. The
 * handlers pass it the shell + the `site_bundle` RPC payload; the tests exercise
 * it directly with a fixture bundle. Every string the old Python backend emitted
 * is reproduced here byte for byte (same tags, same order, same escaping), so the
 * hydrated head keeps matching what crawlers saw before the migration.
 */

export type I18nText = Record<string, string | null | undefined>;

/** The subset of `public.site_bundle(...)` that SEO output reads. */
export interface Bundle {
  site?: {
    brand_name?: I18nText | null;
    default_locale?: string | null;
  } | null;
  content?: {
    home?: {
      seo?: { description?: I18nText | null } | null;
      hero?: {
        eyebrow?: I18nText | null;
        spec_line?: I18nText | null;
      } | null;
    } | null;
  } | null;
  /** `site_bundle` returns published offerings only. */
  offerings?: ReadonlyArray<{ slug?: string | null } | null> | null;
  /** `site_bundle` is arbitrary JSON; extra keys (e.g. tenant, faq) are inlined as-is. */
  [key: string]: unknown;
}

/** Public pages. Keep in step with <Route> paths in frontend/src/App.tsx. */
export const STATIC_PAGES = new Set([
  "services",
  "book",
  "about",
  "doctors",
  "faq",
  "contact",
  "privacy",
  "terms",
]);

/** Same order as seo.py: the sitemap lists these before the offerings. */
export const SITEMAP_PAGES = [
  "",
  "services",
  "about",
  "doctors",
  "faq",
  "contact",
  "book",
  "privacy",
  "terms",
] as const;

const META_RH = /<meta\s+data-rh="true"[^>]*>\s*/gs;
const TITLE = /<title>.*?<\/title>\s*/gs;
const HTML_LANG = /<html lang="[^"]*"/;
const ROOT = '<div id="root"></div>';

const OG_LOCALE: Record<string, string> = { en: "en_MY", ms: "ms_MY", zh: "zh_MY" };
const HTML_LANG_TAG: Record<string, string> = { en: "en", ms: "ms", zh: "zh-Hans" };

/** Python's `html.escape(value, quote=True)`, i.e. the five entities and nothing else. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Python's `xml.sax.saxutils.escape`, which escapes &, < and > (not quotes). */
function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Python's `_pick`: locale, then en, then the fallback. */
function pick(value: I18nText | null | undefined, locale: string, fallback = ""): string {
  const text = value ?? {};
  return text[locale] || text.en || fallback;
}

/**
 * Python's `_json_for_script`: compact JSON plus `<`, U+2028 and U+2029 escaped,
 * so tenant copy can never close the script tag or break the JS parser.
 */
function jsonForScript(data: unknown): string {
  const json = JSON.stringify(data);
  if (json === undefined) return "";
  return json
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Return the SPA shell with this tenant's head tags and bootstrap data.
 * Mirrors seo.py: render_index().
 */
export function renderHead(
  shell: string,
  bundle: Bundle,
  origin: string,
  path: string,
): string {
  const site = bundle.site ?? {};
  const locale = site.default_locale || "en";
  const home = bundle.content?.home ?? {};
  const hero = home.hero ?? {};
  const brand = pick(site.brand_name, locale);
  // Same formula as PageMeta.tsx so the hydrated head matches what crawlers saw.
  const title = `${brand} · ${pick(hero.eyebrow, locale, "Johor Bahru")}`;
  // A dedicated home.seo.description wins; older tenants fall back to the hero line.
  const description = pick(home.seo?.description, locale) || pick(hero.spec_line, locale);
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  const url = origin + (trimmed ? `/${trimmed}` : "/");
  const image = `${origin}/og.png`;

  const meta = (attr: "name" | "property", key: string, content: string): string =>
    `    <meta data-rh="true" ${attr}="${key}" content="${escapeHtml(content)}" />\n`;

  const head =
    `    <title>${escapeHtml(title)}</title>\n` +
    meta("name", "description", description) +
    meta("property", "og:type", "website") +
    meta("property", "og:site_name", brand) +
    meta("property", "og:title", title) +
    meta("property", "og:description", description) +
    meta("property", "og:url", url) +
    meta("property", "og:locale", OG_LOCALE[locale] ?? "en_MY") +
    meta("property", "og:image", image) +
    meta("property", "og:image:width", "1200") +
    meta("property", "og:image:height", "630") +
    meta("property", "og:image:alt", brand) +
    meta("name", "twitter:card", "summary_large_image") +
    meta("name", "twitter:image", image) +
    `    <link rel="canonical" href="${escapeHtml(url)}" />\n`;

  const data = `<script id="__SITE__" type="application/json">${jsonForScript(bundle)}</script>`;
  return shell
    .replace(META_RH, "")
    .replace(TITLE, "")
    .replace("</head>", head + "  </head>")
    .replace(HTML_LANG, `<html lang="${HTML_LANG_TAG[locale] ?? "en"}"`)
    .replace(ROOT, ROOT + "\n    " + data);
}

/**
 * Same rules as seo.py: render if the SPA router has a non-404 route for the
 * path. Unpublished offerings are not in `bundle.offerings`, so they 404.
 */
export function isKnownPath(path: string, bundle: Bundle): boolean {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return true;
  const first = parts[0];
  if (parts.length === 1) return STATIC_PAGES.has(first);
  if (parts.length === 2 && first === "services") {
    const slugs = new Set(
      (bundle.offerings ?? [])
        .map((item) => item?.slug)
        .filter((slug): slug is string => typeof slug === "string"),
    );
    return slugs.has(parts[1]);
  }
  if (parts.length === 2 && first === "booking") return true;
  return false;
}

/** HTTP status for a page route: known paths are 200, everything else a real 404. */
export function statusFor(path: string, bundle: Bundle): 200 | 404 {
  return isKnownPath(path, bundle) ? 200 : 404;
}

/** Mirrors seo.py: robots_txt(). */
export function robotsTxt(origin: string): string {
  return (
    "User-agent: *\n" +
    "Allow: /\n" +
    "Disallow: /booking/\n" +
    "Disallow: /api/\n" +
    `Sitemap: ${origin}/sitemap.xml\n`
  );
}

/** Mirrors seo.py: sitemap_xml(). One <url> per static page plus per published service. */
export function sitemapXml(origin: string, bundle: Bundle): string {
  const paths = SITEMAP_PAGES.map((page) => (page ? `/${page}` : "/"));
  for (const item of bundle.offerings ?? []) {
    if (item && typeof item.slug === "string") paths.push(`/services/${item.slug}`);
  }
  const urls = paths.map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>\n`).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    "</urlset>\n"
  );
}
