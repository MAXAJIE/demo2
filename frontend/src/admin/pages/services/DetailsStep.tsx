import { cn } from "../../../lib/utils";
import type { Locale } from "../../../types";
import { LANGUAGES, servicesCopy } from "./copy";
import { missingTitleLanguages, type LangKey, type ServiceDraft } from "./state";

type LocalizedTextFieldProps = {
  idBase: string;
  label: string;
  hint?: string;
  required: boolean;
  multiline: boolean;
  values: Record<LangKey, string>;
  invalidLanguages: LangKey[];
  showErrors: boolean;
  locale: Locale;
  onChange: (values: Record<LangKey, string>) => void;
};

function LocalizedTextField({
  idBase,
  label,
  hint,
  required,
  multiline,
  values,
  invalidLanguages,
  showErrors,
  locale,
  onChange,
}: LocalizedTextFieldProps) {
  const groupInvalid = required && showErrors && invalidLanguages.length > 0;

  return (
    <fieldset className="rounded-control border border-line bg-surface p-4">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label !mb-0">{label}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
            required ? "badge-pending" : "badge-neutral",
          )}
        >
          {required ? servicesCopy.required[locale] : servicesCopy.optional[locale]}
        </span>
      </div>
      {hint ? <p className="hint mt-1">{hint}</p> : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {LANGUAGES.map((language) => {
          const fieldId = `${idBase}-${language.key}`;
          const invalid = groupInvalid && invalidLanguages.includes(language.key);
          return (
            <div key={language.key}>
              <label
                htmlFor={fieldId}
                className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold text-muted"
              >
                <span className="rounded border border-line px-1 py-0.5 text-[0.6rem]">
                  {language.short}
                </span>
                <span className="truncate">{language.label}</span>
              </label>
              {multiline ? (
                <textarea
                  id={fieldId}
                  rows={3}
                  className="field resize-y"
                  value={values[language.key]}
                  aria-required={required}
                  aria-invalid={invalid}
                  onChange={(event) =>
                    onChange({ ...values, [language.key]: event.target.value })
                  }
                />
              ) : (
                <input
                  id={fieldId}
                  className="field"
                  value={values[language.key]}
                  aria-required={required}
                  aria-invalid={invalid}
                  autoComplete="off"
                  onChange={(event) =>
                    onChange({ ...values, [language.key]: event.target.value })
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      {groupInvalid ? (
        <p className="error-text text-xs">{servicesCopy.titleMissing[locale]}</p>
      ) : null}
    </fieldset>
  );
}

export type DetailsStepProps = {
  locale: Locale;
  draft: ServiceDraft;
  showErrors: boolean;
  onChange: (patch: Partial<ServiceDraft>) => void;
};

/** Step 1: the three i18n JSONB columns, titles required in every language. */
export function DetailsStep({ locale, draft, showErrors, onChange }: DetailsStepProps) {
  return (
    <div className="space-y-4">
      <p className="hint">{servicesCopy.detailsHint[locale]}</p>

      <LocalizedTextField
        idBase="service-title"
        label={servicesCopy.titleField[locale]}
        required
        multiline={false}
        values={draft.title}
        invalidLanguages={missingTitleLanguages(draft)}
        showErrors={showErrors}
        locale={locale}
        onChange={(title) => onChange({ title })}
      />

      <LocalizedTextField
        idBase="service-summary"
        label={servicesCopy.summaryField[locale]}
        hint={servicesCopy.summaryHint[locale]}
        required={false}
        multiline
        values={draft.summary}
        invalidLanguages={[]}
        showErrors={showErrors}
        locale={locale}
        onChange={(summary) => onChange({ summary })}
      />

      <LocalizedTextField
        idBase="service-note"
        label={servicesCopy.noteField[locale]}
        hint={servicesCopy.noteHint[locale]}
        required={false}
        multiline={false}
        values={draft.note}
        invalidLanguages={[]}
        showErrors={showErrors}
        locale={locale}
        onChange={(note) => onChange({ note })}
      />
    </div>
  );
}
