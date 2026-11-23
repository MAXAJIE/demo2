import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { PageMeta } from "../components/site/PageMeta";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { Link001 } from "../components/ui/link-001";
import { SmoothInput } from "../components/ui/smooth-input";
import { createBooking, fetchAvailability } from "../lib/api";
import { reconcileSlot } from "../lib/slot-selection";
import {
  cn,
  datePartsLocalized,
  formatDateLong,
  formatTime,
  isPhoneValid,
  money,
  text,
  whatsappHref,
} from "../lib/utils";
import type { Slot } from "../types";

type FormValues = {
  customer_name: string;
  customer_phone: string;
  consent: boolean;
  website: string;
};

type Step = 1 | 2 | 3;

const STEPS: { value: Step; key: string }[] = [
  { value: 1, key: "booking.wizardDateTime" },
  { value: 2, key: "booking.details" },
  { value: 3, key: "booking.review" },
];

export function BookingPage() {
  const { bundle, locale, t, label } = useTenant();
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const content = bundle.content.booking?.intro;
  const contact = bundle.site.contact;
  const reduceMotion = useReducedMotion();

  const initialService =
    bundle.offerings.find((item) => item.slug === params.get("service")) ?? bundle.offerings[0];
  const [serviceSlug, setServiceSlug] = useState(initialService?.slug ?? "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const consumedSlotParam = useRef(false);
  const dateStripRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const serviceMenuRef = useRef<HTMLDivElement>(null);

  const offering = bundle.offerings.find((item) => item.slug === serviceSlug) ?? null;

  const schema = useMemo(
    () =>
      z.object({
        customer_name: z
          .string()
          .trim()
          .min(2, translate("booking.invalidName"))
          .max(80, translate("booking.invalidName")),
        customer_phone: z
          .string()
          .trim()
          .refine((value) => isPhoneValid(value), translate("booking.invalidPhone")),
        consent: z.boolean().refine((value) => value, translate("booking.consentRequired")),
        website: z.string().max(0),
      }),
    [translate],
  );

  const {
    register,
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    shouldUnregister: false,
    defaultValues: { customer_name: "", customer_phone: "", consent: false, website: "" },
  });

  const availability = useQuery({
    queryKey: ["availability", bundle.tenant.slug, serviceSlug],
    queryFn: () => fetchAvailability(serviceSlug, 21),
    enabled: Boolean(serviceSlug),
    staleTime: 20_000,
  });

  const days = useMemo(() => (availability.data?.days ?? []).slice(0, 14), [availability.data]);

  useEffect(() => {
    if (!availability.data || availability.isFetching) return;
    if (!consumedSlotParam.current) {
      consumedSlotParam.current = true;
      const requested = params.get("slot");
      const day = days.find((item) => item.slots.some((slot) => slot.starts_at === requested));
      const slot = day?.slots.find((item) => item.starts_at === requested);
      if (day && slot) {
        setSelectedDate(day.date);
        setSelectedSlot(slot);
        return;
      }
    }
    setSelectedSlot((current) => reconcileSlot(days, current));
    setSelectedDate((current) =>
      days.some((day) => day.date === current && day.slots.length) ? current : "",
    );
  }, [availability.data, availability.isFetching, days, params]);

  useEffect(() => {
    if (submitError) errorRef.current?.focus();
  }, [submitError]);

  useEffect(() => {
    if (!serviceMenuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!serviceMenuRef.current?.contains(event.target as Node)) setServiceMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setServiceMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [serviceMenuOpen]);

  useEffect(() => {
    if (!selectedDate || !dateStripRef.current) return;
    const container = dateStripRef.current;
    const element = container.querySelector<HTMLElement>(`[data-date="${selectedDate}"]`);
    if (!element) return;
    const left =
      element.getBoundingClientRect().left -
      container.getBoundingClientRect().left +
      container.scrollLeft -
      (container.clientWidth - element.clientWidth) / 2;
    container.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion, selectedDate]);

  const currentDay = days.find((day) => day.date === selectedDate);
  const timeZone = bundle.site.timezone;

  const goToStep = (next: Step) => {
    setSubmitError("");
    setStep(next);
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  };

  const switchService = (slug: string) => {
    // Keep the chosen date, time and the details form intact. The availability
    // effect reconciles the time only after the new service's slots arrive.
    setServiceSlug(slug);
    setSubmitError("");
    setServiceMenuOpen(false);
  };

  const continueFromDateTime = () => {
    if (!offering || !selectedSlot) {
      setSubmitError(translate("booking.selectSlotFirst"));
      return;
    }
    goToStep(2);
  };

  const continueFromDetails = async () => {
    setSubmitError("");
    const valid = await trigger(["customer_name", "customer_phone", "consent"]);
    if (!valid) {
      setSubmitError(translate("booking.checkDetails"));
      return;
    }
    goToStep(3);
  };

  const onInvalid = (formErrors: FieldErrors<FormValues>) => {
    const first = Object.values(formErrors).find(Boolean);
    setSubmitError(first?.message ?? translate("booking.checkDetails"));
  };

  const submit = handleSubmit(async (values) => {
    if (!offering || !selectedSlot) {
      setSubmitError(translate("booking.selectSlotFirst"));
      setStep(1);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await createBooking({
        offering_slug: offering.slug,
        starts_at: selectedSlot.starts_at,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        locale,
        consent: values.consent,
        website: values.website,
      });
      const token = response.booking.cancel_token ?? "";
      navigate(
        `/booking/${encodeURIComponent(response.booking.ref)}#token=${encodeURIComponent(token)}`,
      );
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error ? String(error.code) : "request_failed";
      if (code === "slot_taken" || code === "slot_unavailable") {
        setSubmitError(translate("booking.errorSlotTaken"));
        setSelectedSlot(null);
        setStep(1);
        void availability.refetch();
      } else if (code === "rate_limited") {
        setSubmitError(translate("booking.errorRateLimited"));
      } else if (code === "invalid_phone") {
        setSubmitError(translate("booking.errorInvalidPhone"));
      } else {
        setSubmitError(translate("booking.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  }, onInvalid);

  const brand = text(bundle.site.brand_name, locale);
  const waText =
    locale === "zh"
      ? `你好，我想询问 ${brand} 的预约时段。`
      : locale === "ms"
        ? `Hai ${brand}, saya ingin bertanya tentang slot temujanji.`
        : `Hi ${brand}, I'd like to ask about an appointment slot.`;

  const dateLabel = selectedSlot
    ? formatDateLong(selectedSlot.starts_at, locale, timeZone)
    : selectedDate
      ? formatDateLong(`${selectedDate}T12:00:00+08:00`, locale, timeZone)
      : "";

  const depositLabel = label("deposit_label", translate("common.deposit"));

  const selectedSummary = (
    <div className="space-y-2.5 text-sm">
      <div className="rounded-[15px] border border-line/55 bg-surface/85 p-3.5">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted">
          {translate("booking.step1")}
        </p>
        <p className="mt-1 font-semibold leading-snug">
          {offering ? t(offering.title) : translate("booking.noService")}
        </p>
        {offering?.price_note ? (
          <p className="mt-1 text-xs leading-relaxed text-muted">{t(offering.price_note)}</p>
        ) : null}
      </div>
      <div className="rounded-[15px] border border-line/55 bg-surface/85 p-3.5">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted">
          {translate("booking.step2")}
        </p>
        <p className="mt-1 font-semibold leading-snug">
          {selectedSlot ? dateLabel : translate("booking.pickDateFirst")}
        </p>
        {selectedSlot ? (
          <p className="mt-0.5 text-sm font-semibold text-accent-ink">
            {formatTime(selectedSlot.starts_at, locale, timeZone)}
          </p>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-3 rounded-[15px] border border-accent/15 bg-accent/[0.06] p-3.5">
        <span className="text-muted">{depositLabel}</span>
        <span className="font-semibold">
          {offering?.deposit_cents ? money(offering.deposit_cents) : translate("confirm.noDeposit")}
        </span>
      </div>
      <button
        type="button"
        onClick={() => goToStep(1)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-accent-ink underline decoration-accent/40 underline-offset-4 hover:no-underline"
      >
        {translate("booking.change")}
      </button>
    </div>
  );;

  return (
    <>
      <PageMeta title={t(content?.heading)} description={t(content?.body)} />

      <section className="border-b border-line">
        <div className="container-content py-9 md:py-12">
          <h1 className="display max-w-[18ch] text-[clamp(2.2rem,4.4vw,3.5rem)]">
            {t(content?.heading)}
          </h1>
          <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">{t(content?.body)}</p>
        </div>
      </section>

      <div className="container-content grid min-w-0 gap-6 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <form onSubmit={submit} noValidate className="min-w-0 scroll-mt-28">
          <div ref={panelRef} className="booking-panel min-w-0 scroll-mt-28 p-5 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-muted">
                {translate("booking.stepOf", { current: step })}
              </p>
              <Link
                to="/services"
                className="text-xs font-semibold text-accent-ink underline decoration-accent/40 underline-offset-4 hover:no-underline"
              >
                {translate("home.viewAllServices")}
              </Link>
            </div>

            <ol className="mt-4 grid grid-cols-3 gap-2" aria-label={translate("booking.eyebrow")}>
              {STEPS.map((item) => {
                const active = step === item.value;
                const complete = step > item.value;
                return (
                  <li key={item.value}>
                    <button
                      type="button"
                      disabled={item.value === step}
                      onClick={() => {
                        if (item.value < step) goToStep(item.value);
                      }}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "relative w-full overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-[border-color,background-color,opacity] duration-300",
                        active
                          ? "border-accent/40 shadow-soft"
                          : complete
                            ? "border-line/80 bg-surface/75 hover:bg-surface"
                            : "border-line/60 bg-surface/35 opacity-70",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="booking-step-pill"
                          className="absolute inset-0 rounded-[18px] bg-accent/10"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 330, damping: 30, mass: 0.7 }
                          }
                        />
                      ) : null}
                      <span className="relative z-10 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300",
                            active || complete
                              ? "bg-accent text-accent-on"
                              : "border border-line bg-surface text-muted",
                          )}
                        >
                          {complete ? <Check size={12} aria-hidden="true" /> : item.value}
                        </span>
                        <span className="min-w-0 text-xs font-semibold leading-tight">
                          {translate(item.key)}
                        </span>
                      </span>
                      <span className="relative z-10 mt-2 block h-0.5 overflow-hidden rounded-full bg-line/60">
                        <span
                          className={cn(
                            "block h-full rounded-full bg-accent transition-[width] duration-500",
                            active || complete ? "w-full" : "w-0",
                          )}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <motion.div
              key={step}
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: reduceMotion ? 0 : 0.55,
                ease: [0.16, 1, 0.3, 1],
                layout: { duration: reduceMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] },
              }}
            >
                {step === 1 ? (
                  <section className="pt-6" aria-labelledby="booking-step-1">
                    <h2 id="booking-step-1" className="font-display text-xl font-semibold tracking-tight">
                      {translate("booking.wizardDateTime")}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {translate("booking.chooseDate")} · {translate("booking.chooseTime")}
                    </p>

                    <div className="mt-5">
                      <label className="label" id="service-label">
                        {translate("booking.chooseService")}
                      </label>
                      <div ref={serviceMenuRef} className="relative">
                        <button
                          type="button"
                          id="service_slug"
                          aria-haspopup="listbox"
                          aria-expanded={serviceMenuOpen}
                          aria-controls="booking-service-list"
                          aria-labelledby="service-label service_slug"
                          onClick={() => setServiceMenuOpen((value) => !value)}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              setServiceMenuOpen(true);
                            }
                          }}
                          className={cn(
                            "flex min-h-[3rem] w-full min-w-0 items-center justify-between gap-3 rounded-[16px] border bg-surface px-4 py-2.5 text-left text-sm font-medium shadow-[0_1px_0_rgba(18,32,51,0.04)] transition-all duration-300",
                            serviceMenuOpen
                              ? "border-accent/55 shadow-[0_0_0_3px_rgba(30,78,121,0.10)]"
                              : "border-line/80 hover:border-accent/35",
                          )}
                        >
                          <span className="min-w-0 truncate">
                            {offering ? t(offering.title) : translate("booking.noService")}
                          </span>
                          <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className={cn(
                              "shrink-0 text-muted transition-transform duration-300",
                              serviceMenuOpen && "rotate-180",
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {serviceMenuOpen ? (
                            <motion.div
                              id="booking-service-list"
                              role="listbox"
                              aria-labelledby="service-label"
                              initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.985 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.99 }}
                              transition={{
                                duration: reduceMotion ? 0 : 0.24,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-[18px] border border-line bg-surface p-1.5 shadow-lift"
                            >
                              {bundle.offerings.map((item) => {
                                const selected = item.slug === serviceSlug;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => switchService(item.slug)}
                                    className={cn(
                                      "flex w-full items-start gap-3 rounded-[13px] px-3 py-3 text-left transition-colors duration-200",
                                      selected ? "bg-accent/10 text-ink" : "text-muted hover:bg-surface2 hover:text-ink",
                                    )}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold leading-snug">
                                        {t(item.title)}
                                      </span>
                                      <span className="mt-1 block text-xs leading-relaxed text-muted">
                                        {t(item.price_note)}
                                      </span>
                                    </span>
                                    {selected ? (
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on">
                                        <Check size={12} aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                      {offering ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted">
                          {t(offering.summary)}
                        </p>
                      ) : null}
                    </div>

                    {availability.isLoading ? (
                      <div
                        className="mt-6"
                        role="status"
                        aria-busy="true"
                        aria-label={translate("booking.loadingSlots")}
                      >
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                          {Array.from({ length: 7 }, (_, index) => (
                            <div key={index} className="skeleton h-[4.7rem] w-full rounded-[16px]" />
                          ))}
                        </div>
                        <div className="mt-6 flex items-center justify-between gap-4">
                          <div className="skeleton h-4 w-24" />
                          <div className="skeleton h-3 w-36" />
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div className="skeleton h-12 w-full rounded-[14px]" />
                          <div className="skeleton h-12 w-full rounded-[14px]" />
                          <div className="skeleton h-12 w-full rounded-[14px]" />
                        </div>
                      </div>
                    ) : availability.isError ? (
                      <div className="mt-6 rounded-control border border-line bg-surface p-4 text-sm">
                        <p className="flex items-start gap-2 text-muted">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                          {translate("common.errorBody")}
                        </p>
                        <button
                          type="button"
                          className="btn btn-outline mt-3 !min-h-[2.75rem]"
                          onClick={() => void availability.refetch()}
                        >
                          {translate("common.retry")}
                        </button>
                      </div>
                    ) : !days.length ? (
                      <div className="mt-6 rounded-control border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
                        {translate("booking.noDates")}
                        <Link001
                          className="mt-3 min-h-11 gap-2 text-xs font-semibold text-[#075E54] transition-colors hover:text-[#0F7A3D]"
                          href={whatsappHref(contact.whatsapp, waText)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                          {translate("booking.whatsappInstead")}
                        </Link001>
                      </div>
                    ) : (
                      <>
                        <div
                          ref={dateStripRef}
                          role="radiogroup"
                          aria-labelledby="booking-step-1"
                          className="date-strip mt-6 flex snap-x gap-2 overflow-x-auto md:grid md:grid-cols-7 md:overflow-visible"
                        >
                          {days.map((day) => {
                            const active = day.date === selectedDate;
                            const disabled = day.slots.length === 0;
                            const parts = datePartsLocalized(day.date, locale);
                            return (
                              <button
                                key={day.date}
                                type="button"
                                data-date={day.date}
                                disabled={disabled}
                                onClick={() => {
                                  setSelectedDate(day.date);
                                  setSelectedSlot(null);
                                  setSubmitError("");
                                }}
                                role="radio"
                                aria-checked={active}
                                aria-label={
                                  locale === "zh"
                                    ? `${parts.month}${parts.day} ${parts.weekday}`
                                    : `${parts.weekday} ${parts.day} ${parts.month}`
                                }
                                className={cn(
                                  "hover-lift-sm flex min-h-[4.7rem] min-w-[4.6rem] snap-start flex-col items-center rounded-[16px] border px-3 py-3 transition-all duration-300 md:min-w-0",
                                  active
                                    ? "border-accent bg-accent text-accent-on shadow-soft"
                                    : disabled
                                      ? "cursor-not-allowed border-line/60 text-muted opacity-55"
                                      : "border-line/60 bg-surface/75 hover:border-accent hover:bg-[#DCE8F3] hover:text-accent-ink hover:shadow-soft",
                                )}
                              >
                                {locale === "zh" ? (
                                  <>
                                    <span className="text-xs font-semibold">{parts.month}</span>
                                    <span className="mt-1 font-display text-xl font-semibold leading-none">
                                      {parts.day}
                                    </span>
                                    <span className="mt-1 text-xs">{parts.weekday}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-semibold">{parts.weekday}</span>
                                    <span className="mt-1 font-display text-xl font-semibold leading-none">
                                      {parts.day}
                                    </span>
                                    <span className="mt-1 text-xs">{parts.month}</span>
                                  </>
                                )}
                                <span
                                  className={cn(
                                    "mt-2 inline-block h-1 w-1 rounded-full",
                                    disabled ? "bg-transparent" : active ? "bg-on-brand" : "bg-accent",
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-muted md:hidden">{translate("booking.swipeDates")}</p>

                        <div className="mt-6">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-sm font-semibold">{translate("booking.chooseTime")}</h3>
                            <span className="text-xs text-muted">
                              {currentDay
                                ? translate("booking.timesAvailable", { count: currentDay.slots.length })
                                : translate("booking.pickDateFirst")}
                            </span>
                          </div>
                          <p className="sr-only" aria-live="polite">
                            {currentDay
                              ? translate("booking.timesAvailable", { count: currentDay.slots.length })
                              : ""}
                          </p>
                          {currentDay && currentDay.slots.length ? (
                            <div
                              role="radiogroup"
                              aria-label={translate("booking.chooseTime")}
                              className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
                            >
                              {currentDay.slots.map((slot) => {
                                const active = selectedSlot?.starts_at === slot.starts_at;
                                return (
                                  <button
                                    key={slot.starts_at}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSlot(slot);
                                      setSubmitError("");
                                    }}
                                    role="radio"
                                    aria-checked={active}
                                    className={cn(
                                      "hover-lift-sm min-h-11 rounded-[14px] border px-2 py-2.5 text-sm font-semibold transition-all duration-300",
                                      active
                                        ? "border-accent bg-accent text-accent-on shadow-soft"
                                        : "border-line/60 bg-surface/75 hover:border-accent hover:bg-[#DCE8F3] hover:text-accent-ink hover:shadow-soft",
                                    )}
                                  >
                                    {formatTime(slot.starts_at, locale, timeZone)}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-muted">
                              {selectedDate ? translate("booking.noTimes") : translate("booking.pickDateFirst")}
                            </p>
                          )}
                          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                            <Clock3 size={12} aria-hidden="true" />
                            {translate("booking.earlyNote")}
                          </p>
                        </div>
                      </>
                    )}

                    {submitError ? (
                      <div
                        ref={errorRef}
                        tabIndex={-1}
                        role="alert"
                        className="mt-5 flex items-start gap-2 rounded-control border border-line badge-danger p-3 text-sm leading-relaxed"
                      >
                        <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {submitError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={continueFromDateTime}
                      disabled={availability.isLoading || availability.isFetching}
                      className="btn btn-primary mt-6 w-full !min-h-12"
                    >
                      {translate("booking.continue")}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </section>
                ) : null}

                {step === 2 ? (
                  <section className="pt-6" aria-labelledby="booking-step-2">
                    <h2 id="booking-step-2" className="font-display text-xl font-semibold tracking-tight">
                      {translate("booking.details")}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {translate("booking.phoneHint")}
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="customer_name">
                          {translate("booking.name")}
                        </label>
                        <Controller
                          name="customer_name"
                          control={control}
                          render={({ field }) => (
                            <SmoothInput
                              {...field}
                              id="customer_name"
                              autoComplete="name"
                              className="field"
                              placeholder={translate("booking.namePlaceholder")}
                              aria-invalid={Boolean(errors.customer_name)}
                              aria-describedby={
                                errors.customer_name ? "booking_name-error" : undefined
                              }
                            />
                          )}
                        />
                        {errors.customer_name ? (
                          <p id="booking_name-error" role="alert" className="error-text">
                            {errors.customer_name.message}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="label" htmlFor="customer_phone">
                          {translate("booking.phone")}
                        </label>
                        <Controller
                          name="customer_phone"
                          control={control}
                          render={({ field }) => (
                            <SmoothInput
                              {...field}
                              id="customer_phone"
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              className="field"
                              placeholder={translate("booking.phonePlaceholder")}
                              aria-invalid={Boolean(errors.customer_phone)}
                              aria-describedby={
                                errors.customer_phone ? "booking_phone-error" : undefined
                              }
                            />
                          )}
                        />
                        {errors.customer_phone ? (
                          <p id="booking_phone-error" role="alert" className="error-text">
                            {errors.customer_phone.message}
                          </p>
                        ) : (
                          <p className="hint mt-1">{translate("booking.phoneHint")}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted">
                        <input
                          id="booking_consent"
                          type="checkbox"
                          className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--primary)]"
                          aria-invalid={Boolean(errors.consent)}
                          aria-describedby={errors.consent ? "booking_consent-error" : undefined}
                          {...register("consent")}
                        />
                        <span>
                          {text(bundle.site.consent_text, locale, translate("booking.consent"))}{" "}
                          <Link
                            to="/privacy"
                            className="font-semibold underline decoration-line underline-offset-2 hover:text-ink"
                          >
                            {translate("booking.privacyLink")}
                          </Link>
                        </span>
                      </label>
                      {errors.consent ? (
                        <p id="booking_consent-error" role="alert" className="error-text">
                          {errors.consent.message}
                        </p>
                      ) : null}
                    </div>

                    <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
                      <LockKeyhole size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {translate("booking.secureNote")}
                    </p>

                    {submitError ? (
                      <div
                        ref={errorRef}
                        tabIndex={-1}
                        role="alert"
                        className="mt-5 flex items-start gap-2 rounded-control border border-line badge-danger p-3 text-sm leading-relaxed"
                      >
                        <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {submitError}
                      </div>
                    ) : null}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="btn btn-outline !min-h-12"
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        {translate("booking.back")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void continueFromDetails()}
                        className="btn btn-primary !min-h-12"
                      >
                        {translate("booking.continue")}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                ) : null}

                {step === 3 ? (
                  <section className="pt-6" aria-labelledby="booking-step-3">
                    <h2 id="booking-step-3" className="font-display text-xl font-semibold tracking-tight">
                      {translate("booking.review")}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {translate("booking.reviewNote")}
                    </p>

                    <div className="mt-5 rounded-[18px] border border-line/80 bg-surface p-4">
                      <h3 className="text-sm font-semibold">{translate("booking.summary")}</h3>
                      {selectedSummary}
                      <div className="mt-4 space-y-2 border-t border-line/80 pt-3 text-sm">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-muted">{translate("booking.name")}</span>
                          <span className="max-w-[62%] text-right font-medium">
                            {getValues("customer_name")}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-muted">{translate("booking.phone")}</span>
                          <span className="max-w-[62%] text-right font-medium">
                            {getValues("customer_phone")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
                      <LockKeyhole size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {translate("booking.pendingNotice")}
                    </p>

                    {submitError ? (
                      <div
                        ref={errorRef}
                        tabIndex={-1}
                        role="alert"
                        className="mt-5 flex items-start gap-2 rounded-control border border-line badge-danger p-3 text-sm leading-relaxed"
                      >
                        <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {submitError}
                      </div>
                    ) : null}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="btn btn-outline !min-h-12"
                        disabled={submitting}
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        {translate("booking.back")}
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary !min-h-12"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            {translate("booking.submitting")}
                          </>
                        ) : (
                          <>
                            {translate("booking.confirmBooking")}
                            <ArrowRight size={16} aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </div>
                  </section>
                ) : null}
            </motion.div>

            <div className="mt-6 hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>
          </div>
        </form>

        <aside className="booking-panel p-5 lg:sticky lg:top-28">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted">
            {translate("booking.yourSelection")}
          </p>
          <div className="mt-4">{selectedSummary}</div>

          <div className="mt-5 border-t border-line/80 pt-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
              <CalendarDays size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {text(contact.opening_hours, locale)}
            </p>
            <Link001
              className="mt-3 min-h-11 gap-2 text-xs font-semibold text-[#075E54] transition-colors hover:text-[#0F7A3D]"
              href={whatsappHref(contact.whatsapp, waText)}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {translate("booking.whatsappInstead")}
            </Link001>
          </div>
        </aside>
      </div>
    </>
  );
}
