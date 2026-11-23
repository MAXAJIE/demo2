import type { Locale } from "../../../types";
import { servicesCopy } from "./copy";
import { ServiceCardFrame, ServiceDetailFrame } from "./frames";
import { ImageCropper } from "./ImageCropper";
import { parseRinggitToCents, type ImageKind, type ServiceDraft } from "./state";

export type ImagesStepProps = {
  locale: Locale;
  draft: ServiceDraft;
  previews: Record<ImageKind, string | null>;
  uploading: Record<ImageKind, boolean>;
  errors: Record<ImageKind, string>;
  onCrop: (kind: ImageKind, file: File) => void;
  onPreview: (kind: ImageKind, dataUrl: string | null) => void;
};

/** Step 3: two cropped uploads plus live card and detail previews. */
export function ImagesStep({
  locale,
  draft,
  previews,
  uploading,
  errors,
  onCrop,
  onPreview,
}: ImagesStepProps) {
  const priceCents = parseRinggitToCents(draft.price).cents;
  const depositCents = parseRinggitToCents(draft.deposit).cents;
  const coverUrl = previews.cover ?? draft.images.cover;
  const detailUrl = previews.detail ?? draft.images.detail;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="hint max-w-prose">{servicesCopy.imagesHint[locale]}</p>
        <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
          {servicesCopy.imagesOptional[locale]}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ImageCropper
          kind="cover"
          locale={locale}
          imageUrl={draft.images.cover}
          uploading={uploading.cover}
          error={errors.cover}
          onCrop={onCrop}
          onPreview={onPreview}
        />
        <ImageCropper
          kind="detail"
          locale={locale}
          imageUrl={draft.images.detail}
          uploading={uploading.detail}
          error={errors.detail}
          onCrop={onCrop}
          onPreview={onPreview}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <section aria-label={servicesCopy.cardPreview[locale]}>
          <h3 className="eyebrow mb-2">{servicesCopy.cardPreview[locale]}</h3>
          <ServiceCardFrame
            locale={locale}
            title={draft.title[locale]}
            summary={draft.summary[locale]}
            note={draft.note[locale]}
            priceCents={priceCents}
            depositCents={depositCents}
            status={draft.status}
            coverUrl={coverUrl}
            className="mx-auto w-full max-w-[16rem] lg:max-w-none"
          />
        </section>
        <section aria-label={servicesCopy.detailPreview[locale]}>
          <h3 className="eyebrow mb-2">{servicesCopy.detailPreview[locale]}</h3>
          <ServiceDetailFrame
            locale={locale}
            title={draft.title[locale]}
            summary={draft.summary[locale]}
            note={draft.note[locale]}
            priceCents={priceCents}
            depositCents={depositCents}
            status={draft.status}
            detailUrl={detailUrl}
          />
        </section>
      </div>
    </div>
  );
}
