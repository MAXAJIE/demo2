import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { GoogleMapsIcon } from "../components/site/GoogleMapsIcon";
import { PageMeta } from "../components/site/PageMeta";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { Link001 } from "../components/ui/link-001";
import { Button } from "../components/ui/Button";
import { Button as StatefulButton } from "../components/ui/stateful-button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalProvider,
  ModalTrigger,
} from "../components/ui/animated-modal";
import { createLead } from "../lib/api";
import { isPhoneValid, safeHttpUrl, text, whatsappHref } from "../lib/utils";

type FormValues = {
  customer_name: string;
  customer_phone: string;
  message: string;
  consent: boolean;
  website: string;
};

export function ContactPage() {
  const { bundle, locale, t } = useTenant();
  const { t: translate } = useTranslation();
  const contact = bundle.site.contact;
  const intro = bundle.content.contact?.intro;
  const [result, setResult] = useState<{ ref: string; whatsapp_url: string } | null>(null);
  const [submitError, setSubmitError] = useState("");

  const schema = useMemo(
    () =>
      z.object({
        customer_name: z.string().trim().min(2, translate("booking.invalidName")),
        customer_phone: z
          .string()
          .trim()
          .refine((value) => isPhoneValid(value), translate("booking.invalidPhone")),
        message: z.string().trim().min(5, translate("booking.required")).max(1500),
        consent: z.boolean().refine((value) => value, translate("booking.consentRequired")),
        website: z.string().max(0),
      }),
    [translate],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      message: "",
      consent: false,
      website: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createLead({
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        message: values.message,
        locale,
        consent: values.consent,
        website: values.website,
      }),
    onSuccess: (data) => setResult({ ref: data.lead.ref, whatsapp_url: data.whatsapp_url }),
    onError: () => setSubmitError(translate("contact.error")),
  });

  const onInvalid = (formErrors: FieldErrors<FormValues>) => {
    const first = Object.values(formErrors).find(Boolean);
    setSubmitError(first?.message ?? translate("booking.required"));
  };

  const submit = handleSubmit((values) => {
    setSubmitError("");
    mutation.mutate(values);
  }, onInvalid);

  const waText =
    locale === "zh"
      ? "你好，我想询问看诊相关事宜。"
      : locale === "ms"
        ? "Hai, saya ingin bertanya tentang temujanji."
        : "Hi, I would like to ask about an appointment.";
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(text(contact.address, locale))}&z=16&iwloc=near&output=embed`;

  return (
    <ModalProvider>
      <PageMeta title={t(intro?.heading)} description={t(intro?.body)} />

      <section className="border-b border-line">
        <div className="container-content grid gap-8 py-12 md:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h1 className="display max-w-[18ch] text-[clamp(2.4rem,5vw,4rem)]">
              {t(intro?.heading)}
            </h1>
          </div>
          <p className="max-w-md text-[0.98rem] leading-relaxed text-muted lg:pb-1">{t(intro?.body)}</p>
        </div>
      </section>

      <section className="container-content py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-card bg-[#075E54] p-7 text-white shadow-soft">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#25D366]/15 blur-2xl"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full border border-white/10"
              />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#25D366]/45 bg-[#25D366]/10">
                <WhatsAppIcon className="h-[19px] w-[19px] text-[#25D366]" />
              </span>
              <h2 className="relative mt-5 font-display text-xl font-semibold tracking-tight">
                {translate("contact.whatsappTitle")}
              </h2>
              <p className="relative mt-2 text-sm leading-relaxed text-white/[0.78]">
                {translate("contact.whatsappBody")}
              </p>
              <StatefulButton
                redirectTo={whatsappHref(contact.whatsapp, waText)}
                className="wa-on-dark relative mt-5"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {translate("contact.openWhatsApp")}
              </StatefulButton>
            </div>

            <div className="card divide-y divide-line">
              <div className="flex items-start gap-4 p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-accent-ink">
                  <MapPin size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted">
                    {translate("contact.address")}
                  </p>
                  <address className="mt-1.5 not-italic text-sm leading-relaxed">
                    {text(contact.address, locale)}
                  </address>
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
                  <ModalTrigger className="mt-1 block">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-accent-ink underline decoration-accent/40 underline-offset-4 hover:no-underline"
                    >
                      {translate("contact.contactOptions")}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </button>
                  </ModalTrigger>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-accent-ink">
                  <Clock3 size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted">
                    {translate("contact.hours")}
                  </p>
                  <p className="mt-1.5 space-y-1 text-sm leading-relaxed">
                    {text(contact.opening_hours, locale)
                      .split(" · ")
                      .map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                  </p>
                  <p className="mt-1 text-xs text-muted">{translate("contact.hoursNote")}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-accent-ink">
                  <Phone size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted">
                    {translate("contact.call")}
                  </p>
                  <a
                    className="mt-1.5 inline-block text-sm font-medium transition hover:text-accent-ink"
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="booking-panel p-6 md:p-8">
            {result ? (
              <div className="py-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full badge-confirmed">
                  <CheckCircle2 size={26} aria-hidden="true" />
                </span>
                <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
                  {translate("contact.successTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {translate("contact.successBody")}
                </p>
                <p className="mt-4 inline-block rounded-control border border-line bg-page px-3 py-2 font-mono text-sm font-semibold">
                  {result.ref}
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                  {result.whatsapp_url ? (
                    <a
                      className="btn btn-whatsapp w-full sm:w-auto"
                      href={result.whatsapp_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      {translate("contact.openWhatsApp")}
                    </a>
                  ) : null}
                  <Link className="text-xs font-semibold underline decoration-line underline-offset-4" to="/">
                    {translate("confirm.back")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {translate("contact.formTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {translate("contact.formBody")}
                </p>

                <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="contact_name">
                        {translate("booking.name")}
                      </label>
                      <input
                        id="contact_name"
                        className="field"
                        autoComplete="name"
                        placeholder={translate("booking.namePlaceholder")}
                        aria-invalid={Boolean(errors.customer_name)}
                        aria-describedby={errors.customer_name ? "contact_name-error" : undefined}
                        {...register("customer_name")}
                      />
                      {errors.customer_name ? (
                        <p id="contact_name-error" role="alert" className="error-text">
                          {errors.customer_name.message}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="label" htmlFor="contact_phone">
                        {translate("booking.phone")}
                      </label>
                      <input
                        id="contact_phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        className="field"
                        placeholder={translate("booking.phonePlaceholder")}
                        aria-invalid={Boolean(errors.customer_phone)}
                        aria-describedby={errors.customer_phone ? "contact_phone-error" : undefined}
                        {...register("customer_phone")}
                      />
                      {errors.customer_phone ? (
                        <p id="contact_phone-error" role="alert" className="error-text">
                          {errors.customer_phone.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="contact_message">
                      {translate("contact.message")}
                    </label>
                    <textarea
                      id="contact_message"
                      rows={5}
                      className="field resize-y"
                      placeholder={translate("contact.messagePlaceholder")}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? "contact_message-error" : undefined}
                      {...register("message")}
                    />
                    {errors.message ? (
                      <p id="contact_message-error" role="alert" className="error-text">
                        {errors.message.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="contact_website">Website</label>
                    <input id="contact_website" tabIndex={-1} autoComplete="off" {...register("website")} />
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted">
                      <input
                        id="contact_consent"
                        type="checkbox"
                        className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--primary)]"
                        aria-invalid={Boolean(errors.consent)}
                        aria-describedby={errors.consent ? "contact_consent-error" : undefined}
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
                      <p id="contact_consent-error" role="alert" className="error-text">
                        {errors.consent.message}
                      </p>
                    ) : null}
                  </div>

                  {submitError ? (
                    <div role="alert" className="flex items-start gap-2 rounded-control p-3 text-sm leading-relaxed badge-danger">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {submitError}
                    </div>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? translate("contact.sending") : translate("contact.send")}
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-muted">
                    {translate("booking.secureNote")}
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <Modal labelId="contact-modal-title">
        <ModalContent closeLabel={translate("common.close")}>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted">
            {translate("contact.eyebrow")}
          </p>
          <h2 id="contact-modal-title" className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {translate("contact.modalTitle")}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {translate("contact.modalBody")}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              className="btn btn-whatsapp"
              href={whatsappHref(contact.whatsapp, waText)}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {translate("contact.openWhatsApp")}
            </a>
            <a
              className="btn btn-outline border-2 border-line"
              href={safeHttpUrl(contact.map_url)}
              target="_blank"
              rel="noreferrer"
            >
              <GoogleMapsIcon className="h-4 w-4" />
              {translate("common.openInMaps")}
            </a>
          </div>
        </ModalContent>

        <ModalBody className="pt-0">
          <div className="overflow-hidden rounded-[18px] border border-line bg-surface2">
            <iframe
              title={`${text(bundle.site.brand_name, locale)} map`}
              src={mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-56 w-full border-0"
              allowFullScreen
            />
          </div>
          <address className="mt-4 not-italic text-sm leading-relaxed">
            {text(contact.address, locale)}
          </address>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {translate("contact.hoursNote")}
          </p>
        </ModalBody>

        <ModalFooter className="border-t border-line/80">
          <Link className="btn btn-primary" to="/book">
            {translate("nav.book")}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </ModalFooter>
      </Modal>
    </ModalProvider>
  );
}
