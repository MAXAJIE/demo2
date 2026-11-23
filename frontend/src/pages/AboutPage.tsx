import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { GoogleMapsIcon } from "../components/site/GoogleMapsIcon";
import { PageMeta } from "../components/site/PageMeta";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { Link001 } from "../components/ui/link-001";
import { TextGenerateEffect } from "../components/ui/text-generate-effect";
import { Button as StatefulButton } from "../components/ui/stateful-button";
import { displayClock, safeHttpUrl, text, whatsappHref } from "../lib/utils";

export function AboutPage() {
  const { bundle, locale, t, label } = useTenant();
  const { t: translate } = useTranslation();
  const about = bundle.content.about?.intro;
  const contact = bundle.site.contact;
  const brand = text(bundle.site.brand_name, locale);
  const waText =
    locale === "zh"
      ? `你好，我想询问 ${brand} 的看诊安排。`
      : locale === "ms"
        ? `Hai ${brand}, saya ingin bertanya tentang temujanji.`
        : `Hi ${brand}, I'd like to ask about an appointment.`;

  return (
    <>
      <PageMeta title={t(about?.heading)} description={t(about?.paragraphs?.[0])} />

      <section className="border-b border-line">
        <div className="container-content grid gap-8 py-12 md:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-14">
          <h1 className="display max-w-[20ch] text-[clamp(2.2rem,4.4vw,3.5rem)]">
            {t(about?.heading)}
          </h1>

          {about?.motto ? (
            <div className="lg:border-l lg:border-line lg:pl-10">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted">
                {translate("about.mottoLabel")}
              </p>
              <TextGenerateEffect
                words={t(about.motto)}
                className="max-w-3xl"
                textClassName="font-serif text-[clamp(1.7rem,3.4vw,2.7rem)] font-semibold leading-[1.12] tracking-tight text-ink"
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="container-content py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="max-w-[68ch] space-y-5">
            {about?.paragraphs?.map((paragraph, index) => (
              <p key={index} className="text-[1rem] leading-relaxed text-muted">
                {t(paragraph)}
              </p>
            ))}

            <div className="flex flex-wrap gap-3 pt-4">
              <Link className="btn btn-primary" to="/book">
                {label("book_cta", translate("about.cta"))}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <StatefulButton
                redirectTo={whatsappHref(contact.whatsapp, waText)}
                className="gap-2"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {translate("home.messageWhatsApp")}
              </StatefulButton>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-y border-line">
              <dl className="divide-y divide-line">
                <div className="py-5">
                  <dt className="text-xs font-semibold text-muted">{translate("about.address")}</dt>
                  <dd className="mt-2 text-sm leading-relaxed">{text(contact.address, locale)}</dd>
                  <Link001
                    className="mt-2 min-h-11 text-xs font-semibold"
                    href={safeHttpUrl(contact.map_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <GoogleMapsIcon className="h-3.5 w-3.5" />
                      {translate("common.openInMaps")}
                    </span>
                  </Link001>
                </div>
                <div className="py-5">
                  <dt className="text-xs font-semibold text-muted">{translate("about.hours")}</dt>
                  <dd className="mt-2 space-y-1 text-sm leading-relaxed">
                    {text(contact.opening_hours, locale)
                      .split(" · ")
                      .map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                  </dd>
                  <p className="mt-1 text-xs text-muted">
                    {translate("status.lastSlot", {
                      time: displayClock(contact.last_appointment || "22:30", locale),
                    })}
                  </p>
                </div>
                <div className="py-5">
                  <dt className="text-xs font-semibold text-muted">{translate("contact.call")}</dt>
                  <dd className="mt-2">
                    <a
                      className="inline-flex items-center gap-2 text-sm font-medium transition hover:text-accent-ink"
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    >
                      <Phone size={14} aria-hidden="true" />
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
