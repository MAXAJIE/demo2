import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { safeHttpUrl, text } from "../../lib/utils";

export function PageMeta({
  title,
  description,
  noindex = false,
}: {
  title?: string;
  description?: string;
  noindex?: boolean;
}) {
  const { bundle, locale } = useTenant();
  const brand = text(bundle.site.brand_name, locale);
  const spec = text(bundle.content.home?.hero?.eyebrow, locale, "Johor Bahru");
  const fullTitle = title ? `${title} · ${brand}` : `${brand} · ${spec}`;
  const desc =
    description ??
    (text(bundle.content.home?.seo?.description, locale) ||
      text(bundle.content.home?.hero?.spec_line, locale));
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const ogImage = `${origin}/og.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex ? <meta name="robots" content="noindex" /> : null}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={locale === "zh" ? "zh_MY" : locale === "ms" ? "ms_MY" : "en_MY"} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

export function DentistJsonLd() {
  const { bundle, locale } = useTenant();
  const contact = bundle.site.contact;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const close = contact.closes_at || "23:00";
  const specs = bundle.schedule
    .filter((day) => !day.closed && day.start)
    .map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayNames[day.weekday],
      opens: day.start,
      closes: close,
    }));

  const data = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: text(bundle.site.brand_name, locale),
    description: text(bundle.content.home?.hero?.spec_line, locale),
    address: {
      "@type": "PostalAddress",
      streetAddress: text(contact.address, locale),
      addressCountry: "MY",
    },
    telephone: contact.phone,
    openingHoursSpecification: specs,
    hasMap: safeHttpUrl(contact.map_url),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data).replace(/</g, "\\u003c")}</script>
    </Helmet>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  backTo = "/",
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  backTo?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="container-content flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow text-muted">{t("common.errorTitle")}</p>
      <h1 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h1>
      {description ? <p className="mt-4 max-w-md text-muted">{description}</p> : null}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            {t("common.retry")}
          </button>
        ) : null}
        <Link className="btn btn-outline" to={backTo}>
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
