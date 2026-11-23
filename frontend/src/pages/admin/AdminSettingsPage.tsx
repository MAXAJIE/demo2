import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Info, Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { adminSettings, adminUpdateSettings } from "../../lib/api";
import { cn, text } from "../../lib/utils";
import type { AdminSettings, Locale } from "../../types";
import { AdminPageHeader } from "./AdminLayout";

type FormState = {
  brand_en: string;
  brand_zh: string;
  whatsapp: string;
  phone: string;
  email: string;
  address_en: string;
  address_zh: string;
  map_url: string;
  hours_en: string;
  hours_zh: string;
  closes_at: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  qr_url: string;
  webhook: string;
  offerings_plural_en: string;
  offerings_plural_zh: string;
  offerings_singular_en: string;
  offerings_singular_zh: string;
  book_cta_en: string;
  book_cta_zh: string;
  theme_preset: string;
  default_locale: Locale;
  checkout_mode: string;
  booking_mode: string;
};

function fromSettings(settings: AdminSettings): FormState {
  return {
    brand_en: settings.brand_name.en ?? "",
    brand_zh: settings.brand_name.zh ?? "",
    whatsapp: settings.contact.whatsapp ?? "",
    phone: settings.contact.phone ?? "",
    email: settings.contact.email ?? "",
    address_en: settings.contact.address?.en ?? "",
    address_zh: settings.contact.address?.zh ?? "",
    map_url: settings.contact.map_url ?? "",
    hours_en: settings.contact.opening_hours?.en ?? "",
    hours_zh: settings.contact.opening_hours?.zh ?? "",
    closes_at: settings.contact.closes_at ?? "",
    bank_name: settings.payment_config.bank_name ?? "",
    account_number: settings.payment_config.account_number ?? "",
    account_holder: settings.payment_config.account_holder ?? "",
    qr_url: settings.payment_config.qr_image_url ?? "",
    webhook: settings.payment_config.merchant_webhook_url ?? "",
    offerings_plural_en: settings.labels.offerings_plural?.en ?? "",
    offerings_plural_zh: settings.labels.offerings_plural?.zh ?? "",
    offerings_singular_en: settings.labels.offerings_singular?.en ?? "",
    offerings_singular_zh: settings.labels.offerings_singular?.zh ?? "",
    book_cta_en: settings.labels.book_cta?.en ?? "",
    book_cta_zh: settings.labels.book_cta?.zh ?? "",
    theme_preset: settings.theme_preset,
    default_locale: settings.default_locale,
    checkout_mode: settings.checkout_mode,
    booking_mode: settings.booking_mode,
  };
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="field"
        value={value}
        placeholder={placeholder ?? "—"}
        onChange={onChange}
        autoComplete="off"
      />
      {hint ? <p className="hint mt-1">{hint}</p> : null}
    </div>
  );
}

export function AdminSettingsPage() {
  const { locale } = useTenant();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const query = useQuery({ queryKey: ["admin-settings"], queryFn: adminSettings });

  useEffect(() => {
    if (query.data) setForm(fromSettings(query.data));
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("missing form");
      return adminUpdateSettings({
        brand_name: { en: form.brand_en, zh: form.brand_zh },
        contact: {
          whatsapp: form.whatsapp,
          phone: form.phone,
          email: form.email,
          address_en: form.address_en,
          address_zh: form.address_zh,
          map_url: form.map_url,
          opening_hours_en: form.hours_en,
          opening_hours_zh: form.hours_zh,
          closes_at: form.closes_at,
        },
        payment_config: {
          bank_name: form.bank_name,
          account_number: form.account_number,
          account_holder: form.account_holder,
          qr_image_url: form.qr_url,
          merchant_webhook_url: form.webhook,
        },
        labels: {
          offerings_plural_en: form.offerings_plural_en,
          offerings_plural_zh: form.offerings_plural_zh,
          offerings_singular_en: form.offerings_singular_en,
          offerings_singular_zh: form.offerings_singular_zh,
          book_cta_en: form.book_cta_en,
          book_cta_zh: form.book_cta_zh,
        },
        theme_preset: form.theme_preset,
        default_locale: form.default_locale,
        checkout_mode: form.checkout_mode,
        booking_mode: form.booking_mode,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-settings"], data);
      void queryClient.invalidateQueries({ queryKey: ["tenant"] });
      setSaved(true);
      setError("");
      window.setTimeout(() => setSaved(false), 2000);
    },
    onError: () => setError(t("admin.error")),
  });

  const set =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((current) => (current ? { ...current, [key]: event.target.value } : current));
    };

  if (query.isLoading || !form) {
    return (
      <>
        <AdminPageHeader title={t("admin.settings")} />
        <div className="space-y-3">
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        <AdminPageHeader title={t("admin.settings")} />
        <div className="card p-6 text-sm text-muted">{t("admin.error")}</div>
      </>
    );
  }

  const settings = query.data;

  return (
    <>
      <AdminPageHeader
        title={t("admin.settings")}
        description={text(settings?.brand_name, locale)}
        action={
          <button
            type="submit"
            form="settings-form"
            className="btn btn-primary !min-h-[2.5rem] !text-xs"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={14} aria-hidden="true" />
            )}
            {mutation.isPending ? t("admin.saving") : t("admin.saveSettings")}
          </button>
        }
      />

      {saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-control p-3 text-xs badge-confirmed">
          <Check size={14} aria-hidden="true" />
          {t("admin.saved")}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mb-4 rounded-control p-3 text-xs badge-danger">
          {error}
        </div>
      ) : null}

      <form
        id="settings-form"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          mutation.mutate();
        }}
      >
        <section className="card p-5 md:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {t("admin.general")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="brand_en" label={t("admin.brandEn")} value={form.brand_en} onChange={set("brand_en")} />
            <Field id="brand_zh" label={t("admin.brandZh")} value={form.brand_zh} onChange={set("brand_zh")} />
            <Field id="whatsapp" label={t("admin.whatsapp")} value={form.whatsapp} onChange={set("whatsapp")} />
            <Field id="phone" label={t("admin.phone")} value={form.phone} onChange={set("phone")} />
            <Field
              id="email"
              label={t("admin.email")}
              value={form.email}
              onChange={set("email")}
              type="email"
            />
            <Field
              id="closes_at"
              label={t("admin.closesAt")}
              value={form.closes_at}
              onChange={set("closes_at")}
              placeholder="23:00"
            />
            <div className="sm:col-span-2">
              <Field id="address_en" label={t("admin.addressEn")} value={form.address_en} onChange={set("address_en")} />
            </div>
            <div className="sm:col-span-2">
              <Field id="address_zh" label={t("admin.addressZh")} value={form.address_zh} onChange={set("address_zh")} />
            </div>
            <div className="sm:col-span-2">
              <Field id="map_url" label={t("admin.mapUrl")} value={form.map_url} onChange={set("map_url")} />
            </div>
            <div className="sm:col-span-2">
              <Field id="hours_en" label={t("admin.hoursEn")} value={form.hours_en} onChange={set("hours_en")} />
            </div>
            <div className="sm:col-span-2">
              <Field id="hours_zh" label={t("admin.hoursZh")} value={form.hours_zh} onChange={set("hours_zh")} />
            </div>
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {t("admin.paymentTitle")}
            </h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                settings?.forwarding_configured ? "badge-confirmed" : "badge-neutral",
              )}
            >
              {settings?.forwarding_configured ? t("admin.forwardingOn") : t("admin.forwardingOff")}
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="bank_name" label={t("admin.bankName")} value={form.bank_name} onChange={set("bank_name")} />
            <Field
              id="account_number"
              label={t("admin.accountNumber")}
              value={form.account_number}
              onChange={set("account_number")}
            />
            <Field
              id="account_holder"
              label={t("admin.accountHolder")}
              value={form.account_holder}
              onChange={set("account_holder")}
            />
            <Field id="qr_url" label={t("admin.qrUrl")} value={form.qr_url} onChange={set("qr_url")} />
            <div className="sm:col-span-2">
              <Field id="webhook" label={t("admin.webhook")} value={form.webhook} onChange={set("webhook")} />
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                {t("admin.webhookNote")}
              </p>
            </div>
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {t("booking.eyebrow")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="booking_mode">
                {t("admin.bookingMode")}
              </label>
              <select
                id="booking_mode"
                className="field"
                value={form.booking_mode}
                onChange={set("booking_mode")}
              >
                <option value="approval">{t("admin.approval")}</option>
                <option value="auto">{t("admin.auto")}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="checkout_mode">
                {t("admin.checkoutMode")}
              </label>
              <select
                id="checkout_mode"
                className="field"
                value={form.checkout_mode}
                onChange={set("checkout_mode")}
              >
                <option value="manual_qr_proof">{t("admin.manualQr")}</option>
                <option value="none">{t("admin.noCheckout")}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="default_locale">
                {t("admin.defaultLocale")}
              </label>
              <select
                id="default_locale"
                className="field"
                value={form.default_locale}
                onChange={set("default_locale")}
              >
                {(settings?.locales ?? ["en"]).map((code) => (
                  <option key={code} value={code}>
                    {code === "zh" ? "中文" : code === "ms" ? "Bahasa Melayu" : "English"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {t("admin.theme")}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(settings?.theme_presets ?? []).map((preset) => {
              const active = form.theme_preset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setForm((current) => (current ? { ...current, theme_preset: preset.key } : current))}
                  aria-pressed={active}
                  className={cn(
                    "rounded-control border p-3 text-left transition",
                    active ? "border-brand ring-2 ring-accent/30" : "border-line hover:border-muted/60",
                  )}
                >
                  <span className="flex overflow-hidden rounded-md border border-black/10">
                    <span className="h-9 flex-1" style={{ background: preset.tokens.bg }} />
                    <span className="h-9 flex-1" style={{ background: preset.tokens.surface }} />
                    <span className="h-9 flex-1" style={{ background: preset.tokens.primary }} />
                    <span className="h-9 flex-1" style={{ background: preset.tokens.accent }} />
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{preset.label}</span>
                    {active ? <Check size={13} aria-hidden="true" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {t("admin.labels")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              id="offerings_plural_en"
              label={t("label.offeringsPluralEn")}
              value={form.offerings_plural_en}
              onChange={set("offerings_plural_en")}
            />
            <Field
              id="offerings_plural_zh"
              label={t("label.offeringsPluralZh")}
              value={form.offerings_plural_zh}
              onChange={set("offerings_plural_zh")}
            />
            <Field
              id="offerings_singular_en"
              label={t("label.offeringsSingularEn")}
              value={form.offerings_singular_en}
              onChange={set("offerings_singular_en")}
            />
            <Field
              id="offerings_singular_zh"
              label={t("label.offeringsSingularZh")}
              value={form.offerings_singular_zh}
              onChange={set("offerings_singular_zh")}
            />
            <Field
              id="book_cta_en"
              label={t("label.bookCtaEn")}
              value={form.book_cta_en}
              onChange={set("book_cta_en")}
            />
            <Field
              id="book_cta_zh"
              label={t("label.bookCtaZh")}
              value={form.book_cta_zh}
              onChange={set("book_cta_zh")}
            />
          </div>
        </section>

        <div className="flex justify-end pb-4">
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? t("admin.saving") : t("admin.saveSettings")}
          </button>
        </div>
      </form>
    </>
  );
}
