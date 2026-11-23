import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { cn } from "../../../lib/utils";
import type { Locale } from "../../../types";
import { LANGUAGES, servicesCopy } from "./copy";
import { ServiceCardFrame, ServiceDetailFrame } from "./frames";
import { parseRinggitToCents, type ServiceDraft } from "./state";

export type ServicePreviewProps = {
  locale: Locale;
  draft: ServiceDraft;
  onClose: () => void;
};

/** Read-only mock of the card and detail page, rendered above the wizard. */
export function ServicePreview({ locale, draft, onClose }: ServicePreviewProps) {
  const [previewLocale, setPreviewLocale] = useState<Locale>(locale);
  const priceCents = parseRinggitToCents(draft.price).cents;
  const depositCents = parseRinggitToCents(draft.deposit).cents;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-preview-title"
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-card border border-line bg-page p-5 shadow-lift md:rounded-card md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="service-preview-title"
                className="font-display text-lg font-bold tracking-tight"
              >
                {servicesCopy.previewTitle[locale]}
              </h2>
              <span className="rounded-full border border-line px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                {servicesCopy.previewOnly[locale]}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {servicesCopy.previewHint[locale]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line"
            aria-label={servicesCopy.close[locale]}
            autoFocus
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div
          className="mt-4 flex flex-wrap gap-1.5"
          role="group"
          aria-label={servicesCopy.reviewLanguages[locale]}
        >
          {LANGUAGES.map((language) => {
            const active = language.key === previewLocale;
            return (
              <button
                key={language.key}
                type="button"
                onClick={() => setPreviewLocale(language.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-accent bg-accent text-accent-on"
                    : "border-line text-muted hover:text-ink",
                )}
              >
                {language.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <ServiceCardFrame
            locale={previewLocale}
            title={draft.title[previewLocale]}
            summary={draft.summary[previewLocale]}
            note={draft.note[previewLocale]}
            priceCents={priceCents}
            depositCents={depositCents}
            status={draft.status}
            coverUrl={draft.images.cover}
            className="mx-auto w-full max-w-[16rem] md:max-w-none"
          />
          <ServiceDetailFrame
            locale={previewLocale}
            title={draft.title[previewLocale]}
            summary={draft.summary[previewLocale]}
            note={draft.note[previewLocale]}
            priceCents={priceCents}
            depositCents={depositCents}
            status={draft.status}
            detailUrl={draft.images.detail}
          />
        </div>
      </div>
    </div>
  );
}
