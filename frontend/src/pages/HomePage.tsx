import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

import { useTenant } from "../app/tenant-context";
import type { Locale } from "../types";
import { FaqAccordion } from "../components/site/FaqAccordion";
import { DoctorShowcase } from "../components/site/DoctorShowcase";
import { GoogleMapsIcon } from "../components/site/GoogleMapsIcon";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { HoursGraph } from "../components/site/HoursGraph";
import { ReviewsCarousel } from "../components/site/ReviewsCarousel";
import { PageMeta } from "../components/site/PageMeta";
import { CanvasText } from "../components/ui/canvas-text";
import { DirectionAwareHover } from "../components/ui/direction-aware-hover";
import { BlurReveal } from "../components/ui/blur-reveal";
import { TextAnimationBlurFadeIn } from "../components/ui/text-animation-blur-fade-in";
import { TextLink } from "../components/ui/text-link";
import { Spotlight } from "../components/ui/spotlight-new";
import { Button as StatefulButton } from "../components/ui/stateful-button";

type FocusCard = {
  title: string;
  src: string;
  eyebrow: string;
  price: string;
  note: string;
  href: string;
};
import {
  displayClock,
  formatDateTime,
  formatTime,
  money,
  safeHttpUrl,
  text,
  whatsappHref,
  zonedNow,
} from "../lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const HIGHLIGHT_COLORS = [
  "rgba(30, 78, 121, 1)",
  "rgba(30, 78, 121, 0.94)",
  "rgba(30, 78, 121, 0.88)",
  "rgba(30, 78, 121, 0.82)",
  "rgba(30, 78, 121, 0.76)",
  "rgba(183, 206, 226, 0.9)",
  "rgba(183, 206, 226, 0.76)",
  "rgba(183, 206, 226, 0.62)",
  "rgba(244, 247, 251, 0.82)",
  "rgba(244, 247, 251, 0.64)",
];

/**
 * Abstract wireframe art for the focus cards. These are intentionally not
 * photographs: the clinic has not supplied treatment or team imagery.
 */
const SERVICE_ART = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" preserveAspectRatio="xMidYMid slice">
    <rect width="900" height="1200" fill="#102A43"/>
    <circle cx="700" cy="180" r="310" fill="none" stroke="#B7CEE2" stroke-opacity=".5"/>
    <circle cx="700" cy="180" r="210" fill="none" stroke="#F2F5F9" stroke-opacity=".18"/>
    <path d="M0 930C230 760 430 1010 900 720" fill="none" stroke="#F2F5F9" stroke-opacity=".24" stroke-width="2"/>
    <path d="M-60 1040C220 850 500 1100 960 820" fill="none" stroke="#B7CEE2" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="8 12"/>
    <path d="M450 210c-118 0-182 70-182 176 0 82 40 122 63 210 23 86 18 220 71 220 51 0 38-164 99-164s46 164 97 164c53 0 48-134 71-220 23-88 63-128 63-210 0-106-64-176-182-176-38 0-66 20-97 20s-59-20-97-20Z" fill="none" stroke="#F2F5F9" stroke-opacity=".7" stroke-width="2"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" preserveAspectRatio="xMidYMid slice">
    <rect width="900" height="1200" fill="#24364A"/>
    <g fill="none" stroke="#F2F5F9" stroke-opacity=".2">
      <path d="M90 0v1200M210 0v1200M330 0v1200M450 0v1200M570 0v1200M690 0v1200M810 0v1200"/>
      <path d="M0 160h900M0 320h900M0 480h900M0 640h900M0 800h900M0 960h900"/>
    </g>
    <circle cx="450" cy="560" r="250" fill="#B7CEE2" fill-opacity=".13"/>
    <circle cx="450" cy="560" r="250" fill="none" stroke="#B7CEE2" stroke-opacity=".65"/>
    <circle cx="450" cy="560" r="160" fill="none" stroke="#F2F5F9" stroke-opacity=".42"/>
    <path d="M450 400v320M290 560h320" stroke="#F2F5F9" stroke-opacity=".38"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" preserveAspectRatio="xMidYMid slice">
    <rect width="900" height="1200" fill="#172B3F"/>
    <path d="M-40 980C180 800 270 520 450 520s270 280 490 460v260H-40Z" fill="#B7CEE2" fill-opacity=".12"/>
    <path d="M-40 980C180 800 270 520 450 520s270 280 490 460" fill="none" stroke="#B7CEE2" stroke-opacity=".5"/>
    <path d="M-40 1090C180 910 270 630 450 630s270 280 490 460" fill="none" stroke="#F2F5F9" stroke-opacity=".2"/>
    <g fill="none" stroke="#F2F5F9" stroke-opacity=".42">
      <path d="M170 180h560M170 220h560M170 260h560"/>
      <path d="M170 180v220M730 180v220"/>
    </g>
    <circle cx="700" cy="960" r="12" fill="#B7CEE2"/>
    <circle cx="700" cy="960" r="38" fill="none" stroke="#B7CEE2" stroke-opacity=".55"/>
  </svg>`,
];

function serviceArt(index: number): string {
  return `data:image/svg+xml,${encodeURIComponent(SERVICE_ART[index % SERVICE_ART.length])}`;
}

function nextSlotLabel(
  iso: string,
  dateKey: string,
  locale: Locale,
  timezone: string,
): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (dateKey === today) {
    const label = locale === "zh" ? "今天" : locale === "ms" ? "Hari ini" : "Today";
    return `${label} · ${formatTime(iso, locale, timezone)}`;
  }
  return formatDateTime(iso, locale, timezone);
}

export function HomePage() {
  const { bundle, locale, t, label } = useTenant();
  const { t: translate } = useTranslation();
  const hero = bundle.content.home?.hero;
  const doctors = bundle.content.doctors?.intro;
  const night = bundle.content.home?.night;
  const location = bundle.content.home?.location;
  const reviews = bundle.content.home?.reviews;
  const cta = bundle.content.home?.cta;
  const contact = bundle.site.contact;
  const reduceMotion = useReducedMotion();
  const hoursRef = useRef<HTMLElement>(null);

  const { scrollYProgress: hoursProgress } = useScroll({
    target: hoursRef,
    offset: ["start end", "end start"],
  });
  const hoursShiftRaw = useTransform(hoursProgress, [0, 1], [18, -18]);
  const hoursShift = useSpring(hoursShiftRaw, { stiffness: 110, damping: 22, mass: 0.5 });

  const now = zonedNow(bundle.site.timezone);
  const todaySchedule = bundle.schedule.find((day) => day.weekday === now.weekday);
  const closeTime = displayClock(contact.closes_at || "23:00", locale);
  const todayHours =
    todaySchedule && !todaySchedule.closed && todaySchedule.start
      ? `${displayClock(todaySchedule.start, locale)} – ${closeTime}`
      : translate("hero.closedToday");

  const brand = text(bundle.site.brand_name, locale);
  const waText =
    locale === "zh"
      ? `你好，我想询问 ${brand} 的看诊时段。`
      : locale === "ms"
        ? `Hai ${brand}, saya ingin bertanya tentang slot pergigian.`
        : `Hi ${brand}, I'd like to ask about a dental slot.`;
  const waHref = whatsappHref(contact.whatsapp, waText);
  const mapHref = safeHttpUrl(contact.map_url);
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(
    text(contact.address, locale),
  )}&z=16&iwloc=near&output=embed`;

  const bookCta = label("book_cta", translate("nav.book"));
  const heroNote = hero?.primary_note;
  const featured = bundle.offerings.slice(0, 3);
  const previewFaq = bundle.faq.slice(0, 5);
  const ratingLine = t(hero?.spec_line).split("·")[0].trim();
  const headline = t(hero?.headline);
  const highlight = hero?.highlight ? t(hero.highlight) : "";
  const highlightIndex = highlight ? headline.indexOf(highlight) : -1;
  const hasHighlight = highlightIndex >= 0;
  const headlineBefore = hasHighlight ? headline.slice(0, highlightIndex) : headline;
  const headlineAfter = hasHighlight
    ? headline.slice(highlightIndex + highlight.length)
    : "";

  const serviceCards: FocusCard[] = featured.map((offering, index) => ({
    title: t(offering.title),
    src: serviceArt(index),
    eyebrow: offering.duration_min
      ? translate("common.minutes", { count: offering.duration_min })
      : translate("service.overview"),
    price: offering.price_cents
      ? `${translate("service.from")} ${money(offering.price_cents)}`
      : translate("service.quote"),
    note: t(offering.price_note),
    href: `/services/${offering.slug}`,
  }));

  const reveal = (delay: number) =>
    reduceMotion
      ? { initial: false as const, animate: { y: 0 } }
      : {
          initial: { y: 26, opacity: 0, filter: "blur(18px)", scale: 0.992 },
          animate: { y: 0, opacity: 1, filter: "blur(0px)", scale: 1 },
          transition: { duration: 1.35, delay, ease: EASE },
        };

  return (
    <>
      <PageMeta description={t(hero?.spec_line)} />

      <section className="relative bg-page">
        <motion.div
          className="hero-stage relative overflow-hidden border-b border-line/70"
        >
            <Spotlight
              gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgba(167, 196, 226, .16) 0, rgba(30, 78, 121, .05) 50%, rgba(30, 78, 121, 0) 80%)"
              gradientSecond="radial-gradient(50% 50% at 50% 50%, rgba(198, 216, 235, .12) 0, rgba(30, 78, 121, .03) 80%, transparent 100%)"
              gradientThird="radial-gradient(50% 50% at 50% 50%, rgba(16, 42, 67, .06) 0, rgba(16, 42, 67, .02) 80%, transparent 100%)"
              translateY={-330}
              xOffset={70}
              duration={12}
            />

            <div className="relative z-10 mx-auto flex min-h-[calc(64vh-4.5rem)] max-w-5xl flex-col items-center justify-center px-5 pb-10 pt-16 text-center md:min-h-[calc(68vh-4.5rem)] md:px-10 md:pb-16 md:pt-24">
              <motion.p {...reveal(0)} className="text-xs font-semibold tracking-[0.16em] text-muted">
                {t(hero?.eyebrow)}
              </motion.p>

              <motion.h1
                {...reveal(0.04)}
                initial={reduceMotion ? false : { y: 30, opacity: 0, filter: "blur(24px)", scale: 0.988 }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)", scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 2.0, delay: reduceMotion ? 0 : 0.12, ease: EASE }}
                className="display mt-5 max-w-[18ch] text-[clamp(2.55rem,7.4vw,6.1rem)] leading-[0.98] [text-wrap:balance]"
              >
                {headlineBefore}
                {hasHighlight ? (
                  <CanvasText
                    text={highlight}
                    backgroundClassName="bg-[#1E4E79]"
                    colors={HIGHLIGHT_COLORS}
                    lineGap={4}
                    lineWidth={1.5}
                    curveIntensity={55}
                    animationDuration={5.5}
                    className="mx-[0.06em] align-baseline"
                  />
                ) : null}
                {headlineAfter}
              </motion.h1>

              <motion.p
                {...reveal(0.08)}
                className="mt-6 flex items-center gap-2 text-sm font-medium text-muted"
              >
                <Star size={13} className="fill-[#b9791a] text-[#b9791a]" aria-hidden="true" />
                {ratingLine}
              </motion.p>

              <motion.div
                {...reveal(0.12)}
                className="mt-8 flex flex-wrap items-center justify-center gap-3"
              >
                <Link to="/book" className="btn btn-accent group min-h-12 px-6">
                  {bookCta}
                  <ArrowRight
                    size={17}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
                <StatefulButton redirectTo={waHref} className="min-h-12 gap-2 px-5">
                  <WhatsAppIcon className="h-[17px] w-[17px]" />
                  {translate("hero.message")}
                </StatefulButton>
              </motion.div>

              {heroNote ? (
                <motion.p
                  {...reveal(0.16)}
                  className="mt-6 flex items-center justify-center gap-2.5 text-sm font-medium leading-relaxed text-muted"
                >
                  <span className="h-px w-6 bg-accent/70" aria-hidden="true" />
                  {t(heroNote)}
                </motion.p>
              ) : null}
            </div>

            <div className="relative z-20 mx-auto w-full max-w-5xl px-4 pb-7 md:px-6 md:pb-9">
              <motion.div
                initial={reduceMotion ? false : { y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
                className="appointment-card p-5 md:p-7"
              >
                <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:gap-8">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted">
                          {translate("hero.hoursLabel")}
                        </p>
                        <p className="mt-2 font-display text-[clamp(1.55rem,3vw,2.05rem)] font-semibold leading-tight tracking-tight">
                          {todayHours}
                        </p>
                        <p className="mt-1.5 text-xs text-muted">
                          {translate("status.lastSlot", {
                            time: displayClock(contact.last_appointment || "22:30", locale),
                          })}
                        </p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line/80 bg-white/45 text-muted">
                        <Clock3 size={16} aria-hidden="true" />
                      </span>
                    </div>

                    <div className="mt-5 border-t border-line/80 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold">{translate("hero.nextAvailable")}</p>
                        <TextLink
                          to="/book"
                          className="min-h-11 text-xs font-semibold text-ink transition hover:text-accent-ink"
                        >
                          {translate("hero.viewTimes")}
                        </TextLink>
                      </div>
                      {bundle.next_slots.length ? (
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {bundle.next_slots.slice(0, 2).map((slot, index) => (
                            <motion.li
                              key={slot.starts_at}
                              initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: 0.26 + index * 0.05 }}
                            >
                              <Link
                                to={`/book?slot=${encodeURIComponent(slot.starts_at)}`}
                                className="group flex min-h-11 items-center justify-between gap-3 rounded-[14px] border border-line/80 bg-white/45 px-3 py-2.5 text-sm transition duration-200 hover:border-accent/70 hover:bg-white/70"
                              >
                                <span className="flex items-center gap-2">
                                  <CalendarDays size={14} className="text-muted" aria-hidden="true" />
                                  {nextSlotLabel(
                                    slot.starts_at,
                                    slot.date,
                                    locale,
                                    bundle.site.timezone,
                                  )}
                                </span>
                                <ArrowRight
                                  size={14}
                                  className="text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                                  aria-hidden="true"
                                />
                              </Link>
                            </motion.li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-muted">{translate("hero.noSlots")}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-line/80 pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0">
                    <p className="text-xs font-semibold text-muted">{translate("about.address")}</p>
                    <a
                      className="mt-2 flex min-h-11 items-start gap-2.5 text-sm leading-relaxed text-ink transition hover:text-accent-ink"
                      href={mapHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                      <span>{text(contact.address, locale)}</span>
                    </a>
                    <a
                      className="mt-1 flex min-h-11 items-center gap-2.5 text-sm text-ink transition hover:text-accent-ink"
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    >
                      <Phone size={15} className="shrink-0 text-muted" aria-hidden="true" />
                      {contact.phone}
                    </a>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="frame-soft inline-flex p-[3px]">
                        <StatefulButton
                          redirectTo={mapHref}
                          className="min-h-11 gap-2 rounded-[18px] border-0 bg-[#FBFCFE] px-4 text-xs text-ink hover:bg-[#102A43] hover:text-white"
                        >
                          <GoogleMapsIcon className="h-4 w-4" />
                          {translate("home.locationCta")}
                        </StatefulButton>
                      </span>
                      <TextLink
                        to="/contact"
                        className="min-h-11 text-xs font-semibold text-ink transition hover:text-accent-ink"
                      >
                        {translate("nav.contact")}
                      </TextLink>
                    </div>

                    <p className="mt-4 text-xs text-muted">
                      {translate("services.depositNote")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
        </motion.div>
      </section>

      {doctors ? <DoctorShowcase content={doctors} /> : null}

      <section className="bg-surface">
        <div className="container-content py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[38rem]">
              <TextAnimationBlurFadeIn
                as="h2"
                text={t(bundle.content.services?.intro?.heading)}
                className="display text-[clamp(2rem,4vw,3.1rem)]"
              />
              <TextAnimationBlurFadeIn
                as="p"
                text={t(bundle.content.services?.intro?.body)}
                className="mt-4 max-w-[34rem] text-[0.95rem] leading-relaxed text-muted"
                delay={0.1}
              />
            </div>
            <Link className="btn btn-outline" to="/services">
              {translate("home.viewAllServices")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {serviceCards.map((card) => (
              <div
                key={card.title}
                className="group/card rounded-card shadow-[0_0_0_rgba(0,0,0,0)] transition-shadow duration-700 ease-out hover:shadow-[0_34px_80px_-42px_rgba(18,32,51,0.72)] focus-within:shadow-[0_34px_80px_-42px_rgba(18,32,51,0.72)]"
              >
                <DirectionAwareHover
                  imageUrl={card.src}
                  linkTo={card.href}
                  ariaLabel={card.title}
                  revealOnHover
                  className="h-[22rem] rounded-card md:h-[27rem]"
                  imageClassName="transition-transform duration-700 ease-out"
                  childrenClassName="bottom-0 left-0 right-0 p-5 md:p-6"
                >
                  <div className="max-w-[20rem]">
                    <p className="text-xs font-semibold tracking-[0.12em] text-white/70">
                      {card.eyebrow}
                    </p>
                    <h3 className="mt-2 font-display text-[1.5rem] font-semibold leading-tight tracking-tight md:text-[1.8rem]">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm font-semibold text-white">{card.price}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{card.note}</p>
                  </div>
                </DirectionAwareHover>
              </div>
            ))}
          </div>
        </div>
      </section>

      {night ? (
        <section ref={hoursRef} className="container-content py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <TextAnimationBlurFadeIn
                as="h2"
                text={t(night.heading)}
                className="display max-w-[15ch] text-[clamp(2rem,4vw,3.1rem)]"
              />
              <TextAnimationBlurFadeIn
                as="p"
                text={t(night.body)}
                className="mt-5 max-w-[34rem] text-[0.95rem] leading-relaxed text-muted"
                delay={0.1}
              />
              <TextAnimationBlurFadeIn
                as="p"
                text={t(night.note)}
                className="mt-5 flex items-center gap-2 text-sm text-muted"
                delay={0.16}
              />

              {night.facts?.length ? (
                <BlurReveal delay={0.08}>
                  <dl className="wireframe mt-7 grid overflow-hidden rounded-card sm:grid-cols-3 sm:divide-x sm:divide-line">
                    {night.facts.map((fact, index) => (
                      <div
                        key={`${text(fact.label, locale)}-${index}`}
                        className={`p-4 ${index > 0 ? "border-t border-line sm:border-t-0" : ""}`}
                      >
                        <dt className="text-xs text-muted">{t(fact.label)}</dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">{t(fact.value)}</dd>
                      </div>
                    ))}
                  </dl>
                </BlurReveal>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btn-primary" to="/book">
                  {bookCta}
                </Link>
                <a
                  className="btn btn-whatsapp"
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  {translate("home.messageWhatsApp")}
                </a>
              </div>
            </div>

            <div className="self-start">
              <motion.div
                style={reduceMotion ? undefined : { y: hoursShift }}
                className="wireframe rounded-card p-5 md:p-6"
              >
                <HoursGraph schedule={bundle.schedule} today={now.weekday} />
              </motion.div>
              <p className="mt-2 flex items-center gap-1.5 pl-1 text-xs leading-none text-muted">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--hours-now)] ring-2 ring-white"
                />
                {translate("home.nowLegend")}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {reviews ? (
        <section className="overflow-hidden bg-surface">
          <div className="container-content py-12 md:py-16">
            <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-muted">
                  {translate("home.ratingSource")}
                </p>
                <TextAnimationBlurFadeIn
                  as="h2"
                  text={t(reviews.heading)}
                  className="mt-2 max-w-[22ch] font-display text-[clamp(1.6rem,3vw,2.35rem)] font-semibold tracking-tight"
                />
                <TextAnimationBlurFadeIn
                  as="p"
                  text={t(reviews.body)}
                  className="mt-2 max-w-xl text-sm leading-relaxed text-muted"
                  delay={0.1}
                />
              </div>
            </div>
            <ReviewsCarousel items={reviews.items} rating={4.8} />
          </div>
        </section>
      ) : null}

      {location ? (
        <section className="bg-surface">
          <div className="container-content grid gap-10 py-16 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <TextAnimationBlurFadeIn
                as="h2"
                text={t(location.heading)}
                className="display max-w-[15ch] text-[clamp(2rem,4vw,3.1rem)]"
              />
              <TextAnimationBlurFadeIn
                as="p"
                text={t(location.body)}
                className="mt-5 max-w-[36rem] text-[0.95rem] leading-relaxed text-muted"
                delay={0.1}
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="frame-soft inline-flex p-[3px]">
                  <StatefulButton
                    redirectTo={mapHref}
                    className="gap-2 rounded-[18px] border-0 bg-[#FBFCFE] px-5 text-ink hover:bg-[#102A43] hover:text-white"
                  >
                    <GoogleMapsIcon className="h-[18px] w-[18px]" />
                    {translate("home.locationCta")}
                  </StatefulButton>
                </span>
                <a className="btn btn-whatsapp" href={waHref} target="_blank" rel="noreferrer">
                  <WhatsAppIcon className="h-4 w-4" />
                  {translate("common.whatsapp")}
                </a>
              </div>
            </div>

            <div className="relative min-h-[18rem] overflow-hidden rounded-card border border-line bg-surface2">
              <iframe
                title={text(contact.address, locale)}
                src={mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[22rem] w-full border-0 md:h-[24rem]"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      ) : null}

      {previewFaq.length ? (
        <section className="faq-stage relative overflow-hidden">
          <div className="container-content relative z-10 py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                <TextAnimationBlurFadeIn
                  as="h2"
                  text={t(bundle.content.faq?.intro?.heading)}
                  className="display mx-auto max-w-[16ch] text-[clamp(2rem,4vw,3.1rem)]"
                />
                <TextAnimationBlurFadeIn
                  as="p"
                  text={t(bundle.content.faq?.intro?.body)}
                  className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-relaxed text-muted"
                  delay={0.1}
                />
                <Link className="btn btn-outline mt-7" to="/faq">
                  {translate("home.viewAllFaq")}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-9 text-left">
                <FaqAccordion items={previewFaq} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {cta ? (
        <section className="section-dark">
          <div className="container-content grid gap-8 py-14 md:grid-cols-[1.15fr_0.85fr] md:items-end md:py-20">
            <div>
              <TextAnimationBlurFadeIn
                as="h2"
                text={t(cta.heading)}
                className="display max-w-[18ch] text-[clamp(2rem,4vw,3.1rem)]"
              />
              <TextAnimationBlurFadeIn
                as="p"
                text={t(cta.body)}
                className="mt-4 max-w-lg text-[0.95rem] leading-relaxed mute-dark"
                delay={0.1}
              />
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link className="btn btn-accent" to="/book">
                {bookCta}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a
                className="btn btn-whatsapp"
                href={waHref}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {translate("home.messageWhatsApp")}
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
