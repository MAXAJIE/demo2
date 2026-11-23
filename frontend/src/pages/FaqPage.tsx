import { Helmet } from "react-helmet-async";

import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { FaqAccordion } from "../components/site/FaqAccordion";
import { PageMeta } from "../components/site/PageMeta";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { Button as StatefulButton } from "../components/ui/stateful-button";
import { FlipWords } from "../components/ui/flip-words";
import { text, whatsappHref } from "../lib/utils";

export function FaqPage() {
  const { bundle, locale, t } = useTenant();
  const { t: translate } = useTranslation();
  const contact = bundle.site.contact;
  const intro = bundle.content.faq?.intro;
  const waText =
    locale === "zh"
      ? "你好，我有一个关于看诊的问题。"
      : locale === "ms"
        ? "Hai, saya ada soalan tentang temujanji."
        : "Hi, I have a question about an appointment.";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: bundle.faq.map((item) => ({
      "@type": "Question",
      name: text(item.question, locale),
      acceptedAnswer: { "@type": "Answer", text: text(item.answer, locale) },
    })),
  };

  return (
    <>
      <PageMeta title={t(intro?.heading)} description={t(intro?.body)} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <section className="border-b border-line">
        <div className="container-content py-12 md:py-16">
          <h1 className="display max-w-[18ch] text-[clamp(2.4rem,5vw,4rem)]">
            {t(intro?.heading)}
          </h1>
          <div className="mt-5 max-w-2xl">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
              {translate("faq.questionsAbout")}
              <FlipWords
                words={[
                  translate("faq.rotatingHours"),
                  translate("faq.rotatingFees"),
                  translate("faq.rotatingDirections"),
                ]}
                duration={2600}
                className="font-display text-lg font-semibold text-accent-ink"
              />
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(intro?.body)}</p>
          </div>
        </div>
      </section>

      <section className="faq-stage relative overflow-hidden">
        <div className="container-content relative z-10 py-12 md:py-16">
          <div className="mx-auto max-w-3xl">
            <FaqAccordion items={bundle.faq} />

            <div className="mx-auto mt-10 max-w-xl border-t border-line/80 pt-8 text-center">
              <p className="font-display text-lg font-semibold tracking-tight">
                {translate("faq.moreQuestions")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {text(contact.opening_hours, locale)}
              </p>
              <StatefulButton
                redirectTo={whatsappHref(contact.whatsapp, waText)}
                className="mx-auto mt-5 w-fit gap-2"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {translate("faq.askWhatsApp")}
              </StatefulButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
