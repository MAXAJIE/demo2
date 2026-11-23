import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { useTenant } from "../../../app/tenant-context";
import { WhatsAppIcon } from "../../../components/site/WhatsAppIcon";
import { adminCreateBooking, adminOfferings, fetchAvailability } from "../../../lib/api";
import { cn, displayClock, isPhoneValid, text as pick } from "../../../lib/utils";
import type {
  AdminBookingInput,
  BookingResponse,
  DayScheduleBooking,
  Locale,
  Slot,
} from "../../../types";
import { calendarText } from "./copy";
import type { CalendarCopyKey } from "./copy";
import { errorCode, isSlotBooked, slotsForDate } from "./helpers";

type FieldErrors = { name?: string; phone?: string };

type Props = {
  /** Shared with the page: one date drives the timeline and this form. */
  date: string;
  /** Booked slots from the timeline; these may never be picked again. */
  booked: DayScheduleBooking[];
  onDateChange: (date: string) => void;
  /** A booking was saved: the page pulls the day schedule and the overview. */
  onBooked: () => void;
  /** A slot vanished under our feet: the page pulls the day again. */
  onSlotsStale: () => void;
};

const languages: { value: Locale; key: CalendarCopyKey }[] = [
  { value: "en", key: "languageEn" },
  { value: "ms", key: "languageMs" },
  { value: "zh", key: "languageZh" },
];

export function AddAppointmentForm({ date, booked, onDateChange, onBooked, onSlotsStale }: Props) {
  const { locale } = useTenant();
  const copy = (key: CalendarCopyKey) => calendarText(key, locale);

  const [serviceSlug, setServiceSlug] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // The caller's language defaults to the backstage locale until staff change it.
  const [languageOverride, setLanguageOverride] = useState<Locale | null>(null);
  const language = languageOverride ?? locale;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [created, setCreated] = useState<BookingResponse | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);

  // The confirmation sits at the top of the card; bring it into view after a
  // save so the front desk sees the reference without scrolling back.
  useEffect(() => {
    if (created) successRef.current?.scrollIntoView({ block: "nearest" });
  }, [created]);

  const offeringsQuery = useQuery({ queryKey: ["admin-offerings"], queryFn: adminOfferings });
  const published = useMemo(
    () => (offeringsQuery.data?.offerings ?? []).filter((offering) => offering.status === "published"),
    [offeringsQuery.data],
  );

  // A front-desk booking needs the real slot grid for one service, 30 days out.
  const availability = useQuery({
    queryKey: ["calendar-availability", serviceSlug],
    queryFn: () => fetchAvailability(serviceSlug, 30),
    enabled: Boolean(serviceSlug),
    staleTime: 15_000,
  });

  const slots = useMemo(
    () => (serviceSlug ? slotsForDate(availability.data?.days ?? [], date) : []),
    [availability.data, date, serviceSlug],
  );

  // A refetch, a date change or a booking made elsewhere can invalidate the
  // chosen time; drop it instead of submitting a slot that is no longer free.
  useEffect(() => {
    setSelectedSlot((current) => {
      if (!current) return null;
      const match = slots.find((slot) => slot.starts_at === current.starts_at);
      return match && !isSlotBooked(match.starts_at, booked) ? match : null;
    });
  }, [slots, booked]);

  const mutation = useMutation({
    mutationFn: (input: AdminBookingInput) => adminCreateBooking(input),
    onSuccess: (response) => {
      setCreated(response);
      setFormError("");
      setSlotError("");
      setFieldErrors({});
      // Reset the form for the next caller. The page date is shared page state,
      // so it stays; everything else that belongs to this booking is cleared.
      setServiceSlug("");
      setSelectedSlot(null);
      setName("");
      setPhone("");
      setLanguageOverride(null);
      onBooked();
    },
    onError: (error) => {
      const code = errorCode(error);
      if (code === "slot_unavailable" || code === "slot_taken") {
        setSlotError(copy("slotTaken"));
        setSelectedSlot(null);
        void availability.refetch();
        onSlotsStale();
        return;
      }
      if (code === "invalid_phone") {
        setFieldErrors((current) => ({ ...current, phone: copy("invalidPhone") }));
        return;
      }
      if (code === "invalid_name") {
        setFieldErrors((current) => ({ ...current, name: copy("invalidName") }));
        return;
      }
      setFormError(copy("errorGeneric"));
    },
  });

  const chooseService = (event: ChangeEvent<HTMLSelectElement>) => {
    setServiceSlug(event.target.value);
    setSelectedSlot(null);
    setSlotError("");
    setFormError("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSlotError("");
    setFieldErrors({});

    if (!serviceSlug) {
      setFormError(copy("noService"));
      return;
    }
    if (!selectedSlot) {
      setFormError(copy("slotRequired"));
      return;
    }
    if (isSlotBooked(selectedSlot.starts_at, booked)) {
      // The timeline gained this slot while the form was open: never submit a
      // time the front desk can already see as booked.
      setSelectedSlot(null);
      setSlotError(copy("slotTaken"));
      onSlotsStale();
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFieldErrors({ name: copy("invalidName") });
      return;
    }
    if (!isPhoneValid(phone)) {
      setFieldErrors({ phone: copy("invalidPhone") });
      return;
    }

    setCreated(null);
    mutation.mutate({
      offering_slug: serviceSlug,
      starts_at: selectedSlot.starts_at,
      customer_name: trimmedName,
      customer_phone: phone.trim(),
      locale: language,
      tenantId: null,
    });
  };

  return (
    <section className="card p-5 md:p-6" aria-labelledby="calendar-form-title">
      <h2 id="calendar-form-title" className="font-display text-base font-semibold tracking-tight">
        {copy("formTitle")}
      </h2>
      <p className="mt-1 text-xs text-muted">{copy("formHint")}</p>

      {created ? (
        <div
          ref={successRef}
          className="mt-5 rounded-control border border-line bg-surface2 p-4"
          role="status"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Check size={15} className="text-accent-ink" aria-hidden="true" />
            {copy("successTitle")}
          </p>
          <p className="mt-3 text-xs text-muted">{copy("successRef")}</p>
          <p className="font-mono text-sm">{created.booking.ref}</p>
          {created.whatsapp_url ? (
            <>
              <a
                className="btn btn-whatsapp mt-3 !min-h-[2.4rem] !px-3 !text-xs"
                href={created.whatsapp_url}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {copy("whatsappLink")}
              </a>
              <p className="mt-1.5 text-xs text-muted">{copy("whatsappHint")}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-control p-3 text-xs badge-danger"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {formError}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
        <div>
          <label className="label" htmlFor="calendar-service">
            {copy("serviceLabel")}
          </label>
          <select
            id="calendar-service"
            className="field !bg-surface2 !text-ink"
            value={serviceSlug}
            onChange={chooseService}
            disabled={offeringsQuery.isLoading || mutation.isPending}
          >
            <option value="">
              {offeringsQuery.isLoading ? copy("servicesLoading") : copy("servicePlaceholder")}
            </option>
            {published.map((offering) => (
              <option key={offering.id} value={offering.slug}>
                {pick(offering.title, locale, offering.slug)}
              </option>
            ))}
          </select>
          {offeringsQuery.isError ? (
            <p className="error-text flex flex-wrap items-center gap-2">
              {copy("servicesError")}
              <button
                type="button"
                className="font-semibold underline decoration-line underline-offset-4 hover:no-underline"
                onClick={() => void offeringsQuery.refetch()}
              >
                {copy("retry")}
              </button>
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="calendar-date">
            {copy("dateLabel")}
          </label>
          <input
            id="calendar-date"
            type="date"
            className="field !bg-surface2 !text-ink"
            value={date}
            onChange={(event) => {
              const next = event.target.value;
              if (next) {
                onDateChange(next);
                setSlotError("");
                setFormError("");
              }
            }}
          />
          <p className="hint mt-1">{copy("formDateHint")}</p>
        </div>

        <div>
          <p className="label">{copy("slotsLabel")}</p>
          <p className="hint mb-2">{copy("slotsHint")}</p>

          {!serviceSlug ? (
            <p className="hint">{copy("noService")}</p>
          ) : availability.isLoading ? (
            <div className="flex flex-wrap gap-2" aria-busy="true">
              <span className="sr-only">{copy("slotsLoading")}</span>
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} className="skeleton h-8 w-20 rounded-full" />
              ))}
            </div>
          ) : availability.isError ? (
            <p className="error-text flex flex-wrap items-center gap-2">
              {copy("slotsError")}
              <button
                type="button"
                className="font-semibold underline decoration-line underline-offset-4 hover:no-underline"
                onClick={() => void availability.refetch()}
              >
                {copy("retry")}
              </button>
            </p>
          ) : slots.length === 0 ? (
            <p className="hint">{copy("noSlots")}</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label={copy("slotsLabel")}>
              {slots.map((slot) => {
                const blocked = isSlotBooked(slot.starts_at, booked);
                const selected = selectedSlot?.starts_at === slot.starts_at;
                const clock = displayClock(slot.time, locale);
                return (
                  <button
                    key={slot.starts_at}
                    type="button"
                    disabled={blocked || mutation.isPending}
                    aria-pressed={selected}
                    aria-label={blocked ? `${copy("bookedSlot")} ${clock}` : undefined}
                    title={blocked ? copy("bookedSlot") : undefined}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setSlotError("");
                      setFormError("");
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      blocked
                        ? "border-line bg-surface text-muted line-through opacity-50"
                        : selected
                          ? "border-brand bg-brand text-on-brand"
                          : "border-line bg-surface text-muted hover:text-ink",
                    )}
                  >
                    {clock}
                  </button>
                );
              })}
            </div>
          )}

          {slotError ? (
            <p role="alert" className="mt-2 rounded-control p-2 text-xs badge-danger">
              {slotError}
            </p>
          ) : null}
          <p className="hint mt-2">{copy("slotsWindowHint")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="calendar-name">
              {copy("nameLabel")}
            </label>
            <input
              id="calendar-name"
              className="field !bg-surface2 !text-ink"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder={copy("namePlaceholder")}
              autoComplete="name"
              maxLength={80}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? "calendar-name-error" : undefined}
            />
            {fieldErrors.name ? (
              <p id="calendar-name-error" className="error-text">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="calendar-phone">
              {copy("phoneLabel")}
            </label>
            <input
              id="calendar-phone"
              type="tel"
              inputMode="tel"
              className="field !bg-surface2 !text-ink"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setFieldErrors((current) => ({ ...current, phone: undefined }));
              }}
              placeholder={copy("phonePlaceholder")}
              autoComplete="tel"
              maxLength={24}
              aria-invalid={fieldErrors.phone ? true : undefined}
              aria-describedby={fieldErrors.phone ? "calendar-phone-error" : undefined}
            />
            {fieldErrors.phone ? (
              <p id="calendar-phone-error" className="error-text">
                {fieldErrors.phone}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="calendar-language">
            {copy("languageLabel")}
          </label>
          <select
            id="calendar-language"
            className="field !bg-surface2 !text-ink"
            value={language}
            onChange={(event) => setLanguageOverride(event.target.value as Locale)}
            disabled={mutation.isPending}
          >
            {languages.map((item) => (
              <option key={item.value} value={item.value}>
                {copy(item.key)}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              {copy("submitting")}
            </>
          ) : (
            copy("submit")
          )}
        </button>
      </form>
    </section>
  );
}
