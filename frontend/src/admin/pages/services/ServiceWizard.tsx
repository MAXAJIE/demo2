import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Eye, Loader2, X } from "lucide-react";

import { ApiError, adminUpdateOffering, uploadServiceImage } from "../../../lib/api";
import { cn, text } from "../../../lib/utils";
import type { Locale, Offering } from "../../../types";
import { formatCopy, servicesCopy, type ServicesCopyKey } from "./copy";
import { DetailsStep } from "./DetailsStep";
import { ImagesStep } from "./ImagesStep";
import { PricingStep } from "./PricingStep";
import { ReviewStep } from "./ReviewStep";
import { ServicePreview } from "./ServicePreview";
import {
  buildOfferingPatch,
  draftFromOffering,
  missingTitleLanguages,
  pricingIssues,
  type ImageKind,
  type ServiceDraft,
} from "./state";

const STEP_KEYS = ["details", "pricing", "images", "review"] as const;

type WizardStep = (typeof STEP_KEYS)[number];

const STEP_COPY: Record<WizardStep, ServicesCopyKey> = {
  details: "stepDetails",
  pricing: "stepPricing",
  images: "stepImages",
  review: "stepReview",
};

export type ServiceWizardProps = {
  offering: Offering;
  locale: Locale;
  /** Tenant label for one offering, e.g. "service" or "treatment". */
  singularLabel: string;
  onClose: () => void;
  onSaved: (offering: Offering) => void;
};

function StepRail({ step, locale }: { step: WizardStep; locale: Locale }) {
  const activeIndex = STEP_KEYS.indexOf(step);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1.5 md:gap-3" aria-label={servicesCopy.stepsNav[locale]}>
      {STEP_KEYS.map((item, index) => {
        const active = index === activeIndex;
        const done = index < activeIndex;
        return (
          <li key={item} aria-current={active ? "step" : undefined}>
            <div
              className={cn(
                "h-1 rounded-full",
                done || active ? "bg-accent" : "bg-surface2",
              )}
            />
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
                  active
                    ? "border-accent bg-accent text-accent-on"
                    : done
                      ? "border-accent/60 text-accent-ink"
                      : "border-line text-muted",
                )}
              >
                {done ? <Check size={11} aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[0.7rem] font-medium md:text-xs",
                  active ? "text-ink" : "text-muted",
                )}
              >
                {servicesCopy[STEP_COPY[item]][locale]}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Four-step editor for a single offering.
 *
 * Step 1 edits the i18n JSONB columns, step 2 the ringgit amount stored as
 * cents, step 3 the two cropped images, step 4 reviews everything before
 * `adminUpdateOffering` is called. Image upload failures never block the other
 * steps: the message stays inline and the wizard can still submit.
 */
export function ServiceWizard({
  offering,
  locale,
  singularLabel,
  onClose,
  onSaved,
}: ServiceWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>("details");
  const [draft, setDraft] = useState<ServiceDraft>(() => draftFromOffering(offering));
  const [showErrors, setShowErrors] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState<Record<ImageKind, boolean>>({
    cover: false,
    detail: false,
  });
  const [uploadErrors, setUploadErrors] = useState<Record<ImageKind, string>>({
    cover: "",
    detail: "",
  });
  const [previews, setPreviews] = useState<Record<ImageKind, string | null>>({
    cover: null,
    detail: null,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);

  const stepIndex = STEP_KEYS.indexOf(step);
  const busy = uploading.cover || uploading.detail;

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (previewOpen) {
        setPreviewOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, previewOpen]);

  const update = useCallback((patch: Partial<ServiceDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const handlePreview = useCallback((kind: ImageKind, dataUrl: string | null) => {
    setPreviews((current) =>
      current[kind] === dataUrl ? current : { ...current, [kind]: dataUrl },
    );
  }, []);

  const handleCrop = useCallback(
    async (kind: ImageKind, file: File) => {
      setUploading((current) => ({ ...current, [kind]: true }));
      setUploadErrors((current) => ({ ...current, [kind]: "" }));
      try {
        const { url } = await uploadServiceImage(file, kind);
        setDraft((current) => ({ ...current, images: { ...current.images, [kind]: url } }));
        setPreviews((current) => ({ ...current, [kind]: null }));
      } catch (error) {
        const storageMissing =
          error instanceof ApiError &&
          (error.status === 501 || error.code === "storage_unconfigured");
        setUploadErrors((current) => ({
          ...current,
          [kind]: storageMissing
            ? servicesCopy.storageUnconfigured[locale]
            : servicesCopy.uploadFailed[locale],
        }));
      } finally {
        setUploading((current) => ({ ...current, [kind]: false }));
      }
    },
    [locale],
  );

  const mutation = useMutation({
    mutationFn: () => adminUpdateOffering(offering.id, buildOfferingPatch(draft, offering)),
    onSuccess: ({ offering: updated }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-offerings"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant"] });
      onSaved(updated);
    },
    onError: () =>
      setSaveError(
        formatCopy(servicesCopy.saveError[locale], { service: singularLabel }),
      ),
  });

  const goNext = () => {
    if (step === "details" && missingTitleLanguages(draft).length > 0) {
      setShowErrors(true);
      return;
    }
    const issues = pricingIssues(draft);
    if (step === "pricing" && (issues.price || issues.deposit)) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    const next = STEP_KEYS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    setShowErrors(false);
    const previous = STEP_KEYS[stepIndex - 1];
    if (previous) setStep(previous);
  };

  const submit = () => {
    setSaveError("");
    mutation.mutate();
  };

  const eyebrow = text(offering.title, locale, servicesCopy.untitled[locale]);
  const editTitle = formatCopy(servicesCopy.editService[locale], { service: singularLabel });

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-wizard-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-card border border-line bg-page shadow-lift outline-none md:rounded-card"
      >
        <div className="border-b border-line px-5 pb-4 pt-4 md:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow truncate">{eyebrow}</p>
              <h2
                id="service-wizard-title"
                className="mt-0.5 font-display text-lg font-bold tracking-tight md:text-xl"
              >
                {editTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line"
              aria-label={servicesCopy.close[locale]}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <StepRail step={step} locale={locale} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {saveError ? (
            <div role="alert" className="mb-4 rounded-control p-3 text-xs badge-danger">
              {saveError}
            </div>
          ) : null}

          {step === "details" ? (
            <DetailsStep
              locale={locale}
              draft={draft}
              showErrors={showErrors}
              onChange={update}
            />
          ) : null}
          {step === "pricing" ? (
            <PricingStep
              locale={locale}
              draft={draft}
              showErrors={showErrors}
              onChange={update}
            />
          ) : null}
          {step === "images" ? (
            <ImagesStep
              locale={locale}
              draft={draft}
              previews={previews}
              uploading={uploading}
              errors={uploadErrors}
              onCrop={(kind, file) => void handleCrop(kind, file)}
              onPreview={handlePreview}
            />
          ) : null}
          {step === "review" ? <ReviewStep locale={locale} draft={draft} /> : null}
        </div>

        <div className="border-t border-line px-5 py-3 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={mutation.isPending}
                  className="btn btn-outline !min-h-[2.5rem] !px-3 !text-xs"
                >
                  <ArrowLeft size={13} aria-hidden="true" />
                  {servicesCopy.back[locale]}
                </button>
              ) : (
                <span aria-hidden="true" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="btn btn-outline !min-h-[2.5rem] !px-3 !text-xs"
              >
                <Eye size={13} aria-hidden="true" />
                {servicesCopy.preview[locale]}
              </button>
              {step === "review" ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={mutation.isPending || busy}
                  className="btn btn-primary !min-h-[2.5rem] !px-3.5 !text-xs"
                >
                  {mutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Check size={13} aria-hidden="true" />
                  )}
                  {mutation.isPending
                    ? servicesCopy.submitting[locale]
                    : formatCopy(servicesCopy.saveButton[locale], { service: singularLabel })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={busy}
                  className="btn btn-primary !min-h-[2.5rem] !px-3.5 !text-xs"
                >
                  {servicesCopy.next[locale]}
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {formatCopy(servicesCopy.stepCounter[locale], {
              n: stepIndex + 1,
              total: STEP_KEYS.length,
            })}
          </p>
        </div>
      </div>

      {previewOpen ? (
        <ServicePreview locale={locale} draft={draft} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </div>
  );
}
