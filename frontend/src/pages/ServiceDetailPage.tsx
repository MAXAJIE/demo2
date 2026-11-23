import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { FaqAccordion } from "../components/site/FaqAccordion";
import { PageMeta } from "../components/site/PageMeta";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { ErrorState } from "../components/site/PageMeta";
import { displayClock, money, text, whatsappHref } from "../lib/utils";

export function ServiceDetailPage() {
  const { slug } = useParams();
  const { bundle, locale, t, label } = useTenant();
  const { t: translate } = useTranslation();
  const offering = bundle.offerings.find((item) => item.slug === slug);
  const contact = bundle.site.contact;

  if (!offering) {
    return (
      <ErrorState
        title={translate("service.notFound")}
        backTo="/services"
        description={t(bundle.content.services?.intro?.body)}
      />
    );
  }

  const waText =
    locale === "zh"
      ? `你好，我想询问「${t(offering.title)}」的预约时段。`
      : locale === "ms"
        ? `Hai, saya ingin bertanya tentang slot untuk "${t(offering.title)}".`
        : `Hi, I'd like to ask about a slot for "${t(offering.title)}".`;

  const related = bundle.offerings
    .filter((item) => item.id !== offering.id)
    .slice(0, 2);
  const depositLabel = label("deposit_label", translate("common.deposit"));
  const offersDeposit = Boolean(offering.deposit_cents);

  return (
    <>
      <PageMeta title={t(offering.title)} description={t(offering.summary)} />

      <div className="border-b border-line">
        <div className="container-content py-10 md:py-14">
          <Link
            to="/services"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition hover:text-ink"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            {translate("detail.backAll")}
          </Link>

          <div className="mt-8 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <h1 className="display max-w-[18ch] text-[clamp(2.3rem,4.1vw,3.5rem)]">
                {t(offering.title)}
              </h1>
              <p className="mt-5 max-w-[34rem] text-[1rem] leading-relaxed text-muted">
                {t(offering.summary)}
              </p>

              <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line">
                {offering.duration_min ? (
                  <div className="bg-surface p-5">
                    <dt className="flex items-center gap-1.5 text-xs text-muted">
                      <Clock3 size={12} aria-hidden="true" />
                      {translate("service.duration")}
                    </dt>
                    <dd className="mt-1.5 font-display text-lg font-semibold">
                      {translate("common.minutes", {
                        count: offering.duration_min,
                      })}
                    </dd>
                  </div>
                ) : null}
                <div className="bg-surface p-5">
                  <dt className="text-xs text-muted">
                    {translate("service.format")}
                  </dt>
                  <dd className="mt-1.5 font-display text-lg font-semibold">
                    {translate("service.inPerson")}
                  </dd>
                </div>
                {offersDeposit ? (
                  <div className="bg-surface p-5">
                    <dt className="text-xs text-muted">{depositLabel}</dt>
                    <dd className="mt-1.5 font-display text-lg font-semibold">
                      {money(offering.deposit_cents)}
                    </dd>
                  </div>
                ) : null}
                <div className="bg-surface p-5">
                  <dt className="text-xs text-muted">
                    {translate("service.confirmation")}
                  </dt>
                  <dd className="mt-1.5 font-display text-lg font-semibold">
                    {translate("service.confirmationValue")}
                  </dd>
                </div>
              </dl>
            </div>

            <aside className="card h-fit p-6 md:p-7 lg:sticky lg:top-24">
              <p className="text-xs font-medium text-muted">
                {translate("service.priceLabel")}
              </p>
              <p className="mt-2 font-display text-[1.85rem] font-semibold leading-tight tracking-tight">
                {offering.price_cents
                  ? `${translate("service.from")} ${money(offering.price_cents)}`
                  : translate("service.quote")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t(offering.price_note)}
              </p>

              <div className="my-5 border-t border-line" />

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted">{depositLabel}</span>
                <span className="font-semibold">
                  {offering.deposit_cents
                    ? money(offering.deposit_cents)
                    : translate("confirm.noDeposit")}
                </span>
              </div>
              {offering.deposit_cents ? (
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {translate("booking.depositNote")}
                </p>
              ) : null}

              <Link
                className="btn btn-primary mt-6 w-full"
                to={`/book?service=${encodeURIComponent(offering.slug)}`}
              >
                {translate("service.book")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a
                className="btn btn-whatsapp mt-3 w-full"
                href={whatsappHref(contact.whatsapp, waText)}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {translate("home.messageWhatsApp")}
              </a>

              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
                <CalendarDays
                  size={14}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                {translate("booking.pendingNotice")}
              </p>

              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs leading-relaxed text-muted">
                  {text(contact.opening_hours, locale)}
                </p>
                <p className="mt-1.5 text-xs text-muted">
                  {translate("status.lastSlot", {
                    time: displayClock(
                      contact.last_appointment || "22:30",
                      locale,
                    ),
                  })}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <section className="container-content py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="min-w-0">
            <h2 className="display text-[1.7rem]">
              {translate("service.overview")}
            </h2>
            <p className="mt-4 max-w-[62ch] text-[0.98rem] leading-relaxed text-muted">
              {t(offering.body)}
            </p>

            {offering.attributes.preparation_notes ? (
              <div className="mt-9 border border-line bg-surface p-6">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck
                    size={17}
                    className="text-accent-ink"
                    aria-hidden="true"
                  />
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    {translate("service.preparation")}
                  </h2>
                </div>
                <p className="mt-3 max-w-[60ch] text-[0.92rem] leading-relaxed text-muted">
                  {t(offering.attributes.preparation_notes)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <h2 className="display text-[1.7rem]">
              {translate("detail.faqTitle")}
            </h2>
            <div className="mt-5">
              <FaqAccordion items={bundle.faq.slice(0, 4)} />
            </div>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="border-t border-line bg-surface">
          <div className="container-content py-14 md:py-16">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display text-[1.7rem]">
                {translate("detail.related")}
              </h2>
              <Link
                to="/services"
                className="text-sm font-medium text-muted transition hover:text-ink"
              >
                {translate("home.viewAllServices")}
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/services/${item.slug}`}
                  className="group card flex items-start justify-between gap-6 p-6"
                >
                  <div>
                    <h3 className="font-display text-[1.1rem] font-semibold leading-snug tracking-tight">
                      {t(item.title)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {t(item.summary)}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line transition group-hover:border-transparent group-hover:bg-brand group-hover:text-on-brand">
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
