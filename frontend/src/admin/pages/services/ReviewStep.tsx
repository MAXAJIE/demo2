import { cn, money } from "../../../lib/utils";
import type { Locale } from "../../../types";
import { LANGUAGES, servicesCopy } from "./copy";
import { parseRinggitToCents, SERVICE_IMAGE_SPECS, type ServiceDraft } from "./state";

export type ReviewStepProps = {
  locale: Locale;
  draft: ServiceDraft;
};

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

/** Step 4: every language, the money, and both images before submitting. */
export function ReviewStep({ locale, draft }: ReviewStepProps) {
  const priceCents = parseRinggitToCents(draft.price).cents;
  const depositCents = parseRinggitToCents(draft.deposit).cents;
  const cover = SERVICE_IMAGE_SPECS.cover;
  const detail = SERVICE_IMAGE_SPECS.detail;

  return (
    <div className="space-y-4">
      <p className="hint">{servicesCopy.reviewHint[locale]}</p>

      <section className="card p-4 md:p-5">
        <h3 className="text-sm font-semibold">{servicesCopy.reviewLanguages[locale]}</h3>
        <div className="mt-3 space-y-3">
          {LANGUAGES.map((language) => (
            <div
              key={language.key}
              className="rounded-control border border-line bg-page p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{language.label}</span>
                <span className="rounded border border-line px-1 py-0.5 text-[0.6rem] font-semibold text-muted">
                  {language.short}
                </span>
              </div>
              <dl className="mt-2 space-y-1.5 text-xs">
                <ReviewRow
                  label={servicesCopy.titleField[locale]}
                  value={draft.title[language.key]}
                />
                <ReviewRow
                  label={servicesCopy.summaryField[locale]}
                  value={draft.summary[language.key]}
                />
                <ReviewRow
                  label={servicesCopy.noteField[locale]}
                  value={draft.note[language.key]}
                />
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="hint">{servicesCopy.priceField[locale]}</dt>
            <dd className="text-sm font-semibold">
              {priceCents !== null ? money(priceCents) : servicesCopy.notSet[locale]}
            </dd>
          </div>
          <div>
            <dt className="hint">{servicesCopy.depositField[locale]}</dt>
            <dd className="text-sm font-semibold">
              {depositCents !== null ? money(depositCents) : servicesCopy.notSet[locale]}
            </dd>
          </div>
          <div>
            <dt className="hint">{servicesCopy.currencyLabel[locale]}</dt>
            <dd className="text-sm font-semibold">MYR</dd>
          </div>
          <div>
            <dt className="hint">{servicesCopy.statusField[locale]}</dt>
            <dd className="mt-0.5">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                  draft.status === "published" ? "badge-confirmed" : "badge-neutral",
                )}
              >
                {draft.status === "published"
                  ? servicesCopy.statusPublished[locale]
                  : servicesCopy.statusDraft[locale]}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-4 md:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="eyebrow mb-2">
              {servicesCopy.coverLabel[locale]} · {cover.ratioLabel}
            </h3>
            {draft.images.cover ? (
              <img
                src={draft.images.cover}
                alt={servicesCopy.coverLabel[locale]}
                className="w-full max-w-[12rem] rounded-control border border-line object-cover"
                style={{ aspectRatio: cover.cssAspect }}
              />
            ) : (
              <div
                className="flex w-full max-w-[12rem] items-center justify-center rounded-control border border-dashed border-line p-4 text-center text-xs text-muted"
                style={{ aspectRatio: cover.cssAspect }}
              >
                {servicesCopy.noImageYet[locale]}
              </div>
            )}
          </div>
          <div>
            <h3 className="eyebrow mb-2">
              {servicesCopy.detailLabel[locale]} · {detail.ratioLabel}
            </h3>
            {draft.images.detail ? (
              <img
                src={draft.images.detail}
                alt={servicesCopy.detailLabel[locale]}
                className="w-full rounded-control border border-line object-cover"
                style={{ aspectRatio: detail.cssAspect }}
              />
            ) : (
              <div
                className="flex w-full items-center justify-center rounded-control border border-dashed border-line p-4 text-center text-xs text-muted"
                style={{ aspectRatio: detail.cssAspect }}
              >
                {servicesCopy.noImageYet[locale]}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
