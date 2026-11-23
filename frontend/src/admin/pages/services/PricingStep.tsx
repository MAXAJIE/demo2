import { money } from "../../../lib/utils";
import type { Locale } from "../../../types";
import { servicesCopy } from "./copy";
import { parseRinggitToCents, pricingIssues, type ServiceDraft } from "./state";

export type PricingStepProps = {
  locale: Locale;
  draft: ServiceDraft;
  showErrors: boolean;
  onChange: (patch: Partial<ServiceDraft>) => void;
};

type MoneyFieldProps = {
  id: string;
  label: string;
  value: string;
  hint: string;
  invalid: boolean;
  locale: Locale;
  onChange: (value: string) => void;
};

function MoneyField({ id, label, value, hint, invalid, locale, onChange }: MoneyFieldProps) {
  const parsed = parseRinggitToCents(value);
  const showError = invalid && parsed.invalid;

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-muted">
          RM
        </span>
        <input
          id={id}
          className="field pl-10"
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          value={value}
          aria-invalid={showError}
          aria-describedby={`${id}-hint`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <p id={`${id}-hint`} className={showError ? "error-text" : "hint mt-1"}>
        {showError
          ? servicesCopy.priceInvalid[locale]
          : parsed.cents !== null
            ? `${hint} · ${money(parsed.cents)}`
            : hint}
      </p>
    </div>
  );
}

/** Step 2: ringgit input stored as integer cents, currency fixed to MYR. */
export function PricingStep({ locale, draft, showErrors, onChange }: PricingStepProps) {
  const issues = pricingIssues(draft);

  return (
    <div className="space-y-4">
      <section className="card p-4 md:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField
            id="service-price"
            label={servicesCopy.priceField[locale]}
            value={draft.price}
            hint={servicesCopy.priceHint[locale]}
            invalid={showErrors && issues.price}
            locale={locale}
            onChange={(price) => onChange({ price })}
          />
          <MoneyField
            id="service-deposit"
            label={servicesCopy.depositField[locale]}
            value={draft.deposit}
            hint={servicesCopy.priceHint[locale]}
            invalid={showErrors && issues.deposit}
            locale={locale}
            onChange={(deposit) => onChange({ deposit })}
          />
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="service-currency">
              {servicesCopy.currencyLabel[locale]}
            </label>
            <input
              id="service-currency"
              className="field opacity-70"
              value="MYR"
              readOnly
              aria-describedby="service-currency-hint"
            />
            <p id="service-currency-hint" className="hint mt-1">
              {servicesCopy.currencyHint[locale]}
            </p>
          </div>
          <div>
            <label className="label" htmlFor="service-status">
              {servicesCopy.statusField[locale]}
            </label>
            <select
              id="service-status"
              className="field"
              value={draft.status}
              onChange={(event) =>
                onChange({ status: event.target.value === "published" ? "published" : "draft" })
              }
            >
              <option value="draft">{servicesCopy.statusDraft[locale]}</option>
              <option value="published">{servicesCopy.statusPublished[locale]}</option>
            </select>
            <p className="hint mt-1">{servicesCopy.statusHint[locale]}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
