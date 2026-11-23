import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { PageMeta } from "../components/site/PageMeta";
import { formatDateLong } from "../lib/utils";

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { bundle, locale, t } = useTenant();
  const { t: translate } = useTranslation();
  const page = bundle.content.legal?.[kind];

  if (!page) {
    return (
      <div className="container-content py-24 text-center">
        <h1 className="font-display text-3xl font-bold">{translate("common.notFoundTitle")}</h1>
        <Link className="btn btn-primary mt-6" to="/">
          {translate("confirm.back")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={t(page.title)} description={t(page.sections[0]?.paragraphs[0])} />

      <section className="border-b border-line">
        <div className="container-content py-14 md:py-20">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {translate("legal.back")}
          </Link>
          <h1 className="display mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4rem)]">{t(page.title)}</h1>
          <p className="mt-4 text-xs text-muted">
            {translate("legal.updated")}
            {locale === "zh" ? "：" : ": "}
            {formatDateLong(`${page.updated}T12:00:00+08:00`, locale, bundle.site.timezone)}
          </p>
        </div>
      </section>

      <section className="container-content py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
          <nav aria-label={translate("legal.onThisPage")} className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow text-muted">{translate("legal.contents")}</p>
            <ol className="mt-4 space-y-2.5 text-sm">
              {page.sections.map((section, index) => (
                <li key={index} className="flex gap-3">
                  <span className="text-xs font-semibold text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#section-${index + 1}`}
                    className="text-muted underline decoration-line underline-offset-4 transition hover:text-ink"
                  >
                    {t(section.heading)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="prose-clinic max-w-none">
            {page.sections.map((section, index) => (
              <section key={index} id={`section-${index + 1}`} className="scroll-mt-24">
                <h2>
                  <span className="mr-3 text-xs font-semibold text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {t(section.heading)}
                </h2>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex}>{t(paragraph)}</p>
                ))}
              </section>
            ))}
            <div className="mt-10 border-t border-line pt-6">
              <Link className="btn btn-outline" to="/">
                {translate("legal.back")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
