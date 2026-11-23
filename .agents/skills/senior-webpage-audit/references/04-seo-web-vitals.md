# Pillar 4: Dual-Track Technical SEO & Core Web Vitals Manual

Deliver top-tier search visibility and conversion readiness for public SaaS pages while keeping private application shells strictly isolated from search crawlers.

## 1. Dual-Track Route Strategy (Public vs. Authenticated)

Apply distinct indexation rules based on route purpose:

- **Track A: Public Marketing & Content Routes (`/`, `/pricing`, `/features`, `/about`, `/blog/*`, `/docs/*`)**:
  - Must be server-rendered (SSR/SSG/ISR) so crawlers receive full HTML content on initial request without executing client JS.
  - Must declare `index: true, follow: true`, a self-referencing canonical URL, complete Open Graph/Twitter cards, and Schema.org JSON-LD.
- **Track B: Authenticated App, Dashboard & Auth Routes (`/dashboard/*`, `/app/*`, `/workspace/*`, `/settings/*`, `/login`, `/signup`)**:
  - Must enforce `robots: { index: false, follow: false }` (`<meta name="robots" content="noindex, nofollow" />`).
  - Must be excluded from `sitemap.xml` and blocked from unnecessary crawling in `robots.txt` (`Disallow: /dashboard/`, `Disallow: /app/`, `Disallow: /api/`).
  - Never put `noindex` on the root layout if it wraps public marketing pages; scope `noindex` strictly to the authenticated route group layout.

## 2. Metadata, Canonical & Social Graph Checklist

Audit every public route's metadata export (`generateMetadata` / `<head>`):

- **Title Tag**: Unique per page, `50-60` characters, front-loading primary value/keyword + brand name.
- **Meta Description**: Unique per page, `140-160` characters, written as a clear, high-CTR summary (never duplicated across routes).
- **Canonical URL**: Explicit self-referencing `<link rel="canonical" href="https://..." />` matching the exact production origin, HTTPS protocol, and trailing-slash convention, stripping tracking query params (`utm_*`).
- **Open Graph & Twitter Cards**:
  - `og:title`, `og:description`, `og:url`, `og:site_name`, `og:type` (`website` or `article`), and `og:image` (`1200x630` absolute URL with `og:image:alt`).
  - `twitter:card` set to `summary_large_image` with matching title, description, and image.

## 3. Semantic HTML & Schema.org JSON-LD

- **Heading Hierarchy**:
  - Exactly **one** `<h1>` per page describing the core page topic.
  - Sequential heading levels (`H1 -> H2 -> H3`); never skip from `H1` to `H4` just for font sizing (use CSS utility classes instead).
- **Semantic Landmarks & Links**:
  - Wrap page sections in `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, and `<footer>` rather than generic `<div>` soup.
  - All internal and external navigation must use real `<a href="...">` / framework `<Link href="...">` elements, never `<div onClick={...}>`.
- **Structured Data (JSON-LD)**:
  - Inject valid `<script type="application/ld+json">` matching the page type:
    - **SaaS Landing / Product Page**: `SoftwareApplication` (with `name`, `applicationCategory`, `operatingSystem`, `offers`) + `Organization` (with `name`, `url`, `logo`).
    - **Pricing / FAQ Section**: `FAQPage` with `mainEntity` `Question` and `AcceptedAnswer` items matching visible on-page copy.
    - **Blog / Guide**: `Article` or `TechArticle` with `headline`, `datePublished`, `dateModified`, `author`, and `image`.

## 4. Crawl Infrastructure & Core Web Vitals

- **`robots.txt` & `sitemap.xml`**: Verify both endpoints exist, return valid `200` responses, reference the absolute `Sitemap:` URL in `robots.txt`, and list only canonical public `200`-status routes with accurate `lastModified` timestamps.
- **Largest Contentful Paint (`LCP < 2.5s`)**:
  - Hero text and hero image must be present in initial SSR HTML.
  - Mark hero `<img>` / `<Image>` with `priority` / `fetchpriority="high"`.
  - Load fonts via `next/font` or preloaded `woff2` with `font-display: swap`.
- **Interaction to Next Paint (`INP < 200ms`)**:
  - Keep click and input handlers lightweight; defer non-critical third-party analytics scripts (`strategy="afterInteractive"` or `lazyOnload`).
- **Cumulative Layout Shift (`CLS < 0.1`)**:
  - Lock dimensions on all images, videos, embeds, and async slots; avoid injecting banners above existing viewport content after load.
