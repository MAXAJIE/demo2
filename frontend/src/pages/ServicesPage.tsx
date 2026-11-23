import { Link } from "react-router-dom";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { PageMeta } from "../components/site/PageMeta";
import { ServiceStickyCta } from "../components/site/ServiceStickyCta";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { money } from "../lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ServicesPage() {
  const { bundle, t, label } = useTenant();
  const { t: translate } = useTranslation();
  const content = bundle.content.services?.intro;
  const depositLabel = label("deposit_label", translate("common.deposit"));
  const reduceMotion = useReducedMotion();

  return (
    <>
      <PageMeta title={t(content?.heading)} description={t(content?.body)} />

      <section className="border-b border-line/80">
        <div className="container-content grid gap-8 py-12 md:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <h1 className="display max-w-[16ch] text-[clamp(2.2rem,4.4vw,3.5rem)]">
            {t(content?.heading)}
          </h1>
          <div className="lg:pb-1">
            <p className="max-w-md text-[0.95rem] leading-relaxed text-muted">{t(content?.body)}</p>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-muted">
              {translate("services.depositNote")}
            </p>
          </div>
        </div>
      </section>

      <section className="container-content py-10 pb-28 md:py-14 md:pb-32">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {bundle.offerings.map((offering, index) => (
            <motion.div
              key={offering.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: reduceMotion ? 0 : 0.7,
                delay: reduceMotion ? 0 : index * 0.07,
                ease: EASE,
              }}
              className="h-full"
            >
              <Link
                to={`/services/${offering.slug}`}
                className="hover-lift-md group flex h-full min-h-[18rem] flex-col justify-between rounded-card border border-line/80 bg-surface p-6 shadow-soft transition duration-300 hover:border-primary/30 hover:shadow-lift md:p-7"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold tabular-nums text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {offering.duration_min ? (
                      <>
                        <Clock3 size={12} aria-hidden="true" />
                        {translate("common.minutes", { count: offering.duration_min })}
                      </>
                    ) : null}
                  </span>
                </div>

                <div className="mt-10">
                  <h2 className="max-w-[24ch] font-display text-[clamp(1.4rem,2.4vw,1.85rem)] font-semibold leading-snug tracking-tight">
                    {t(offering.title)}
                  </h2>
                  <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-muted">
                    {t(offering.summary)}
                  </p>
                </div>

                <div className="mt-8 flex items-end justify-between gap-5 border-t border-line/80 pt-4">
                  <div>
                    <p className="text-sm font-medium leading-snug text-ink">
                      {t(offering.price_note)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {offering.price_cents
                        ? `${translate("service.from")} ${money(offering.price_cents)}`
                        : translate("service.quote")}
                      {offering.deposit_cents
                        ? ` · ${money(offering.deposit_cents)} ${depositLabel.toLowerCase()}`
                        : ""}
                    </p>
                  </div>
                  <span className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-on-brand group-hover:shadow-[0_12px_26px_-16px_rgba(18,32,51,0.75)] group-focus-visible:border-primary group-focus-visible:bg-primary group-focus-visible:text-on-brand group-hover:backdrop-blur-sm group-focus-visible:backdrop-blur-sm">
                    <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[8rem] group-hover:opacity-100 group-focus-visible:max-w-[8rem] group-focus-visible:opacity-100">
                      {translate("service.details")}
                    </span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: reduceMotion ? 0 : 0.7,
              delay: reduceMotion ? 0 : bundle.offerings.length * 0.07,
              ease: EASE,
            }}
            className="h-full"
          >
            <Link
              to="/contact"
              className="hover-lift-md group flex h-full min-h-[18rem] flex-col justify-between rounded-card bg-primary p-6 text-on-brand shadow-lift transition duration-300 hover:bg-[#1b3128] md:p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold tabular-nums text-on-brand/75">
                  {String(bundle.offerings.length + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-medium text-on-brand/75">
                  {translate("services.specialEyebrow")}
                </span>
              </div>
              <div className="mt-10">
                <h2 className="max-w-[20ch] font-display text-[clamp(1.4rem,2.4vw,1.85rem)] font-semibold leading-snug tracking-tight">
                  {translate("services.specialTitle")}
                </h2>
                <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-on-brand/75">
                  {translate("services.specialBody")}
                </p>
              </div>
              <div className="mt-8 flex items-end justify-between gap-5 border-t border-on-brand/20 pt-4">
                <span className="text-sm font-medium">{translate("services.specialCta")}</span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#25D366]/35 bg-[#25D366]/10 text-[#25D366] transition duration-300 group-hover:border-[#25D366]/70 group-hover:bg-[#25D366]/20">
                  <WhatsAppIcon className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      <ServiceStickyCta />
    </>
  );
}
