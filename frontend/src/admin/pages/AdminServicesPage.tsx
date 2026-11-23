import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";

import { useTenant } from "../../app/tenant-context";
import { adminOfferings } from "../../lib/api";
import { money, text } from "../../lib/utils";
import type { Offering } from "../../types";
import { AdminPageHeader } from "./AdminLayout";
import { formatCopy, servicesCopy } from "./services/copy";
import { ServiceWizard } from "./services/ServiceWizard";
import { offeringImages } from "./services/state";

export function AdminServicesPage() {
  const { locale, label } = useTenant();
  const query = useQuery({ queryKey: ["admin-offerings"], queryFn: adminOfferings });
  const [editing, setEditing] = useState<Offering | null>(null);
  const [savedNotice, setSavedNotice] = useState("");

  const pluralLabel = label("offerings_plural", servicesCopy.title[locale]);
  const singularLabel = label("offerings_singular", servicesCopy.serviceWord[locale]);
  const colon = locale === "zh" ? "：" : ": ";

  return (
    <>
      <AdminPageHeader
        title={pluralLabel}
        description={formatCopy(servicesCopy.subtitle[locale], { service: singularLabel })}
      />

      {savedNotice ? (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-control p-3 text-xs badge-confirmed"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Check size={14} aria-hidden="true" />
            <span>{formatCopy(servicesCopy.savedBanner[locale], { service: singularLabel })}</span>
            <span className="truncate font-semibold">{savedNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setSavedNotice("")}
            className="shrink-0"
            aria-label={servicesCopy.close[locale]}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-3">
          <div className="skeleton h-28 w-full" />
          <div className="skeleton h-28 w-full" />
          <div className="skeleton h-28 w-full" />
        </div>
      ) : query.isError ? (
        <div className="card p-6 text-sm text-muted">{servicesCopy.loadError[locale]}</div>
      ) : query.data && query.data.offerings.length > 0 ? (
        <div className="space-y-3">
          {query.data.offerings.map((offering) => {
            const images = offeringImages(offering);
            const summary = text(offering.summary, locale);
            return (
              <article key={offering.id} className="card p-4 md:p-5">
                <div className="flex gap-3 md:gap-4">
                  {images.cover ? (
                    <div className="relative w-16 shrink-0 overflow-hidden rounded-control border border-line md:w-20">
                      <img
                        src={images.cover}
                        alt=""
                        className="w-full object-cover"
                        style={{ aspectRatio: "4 / 5" }}
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-base font-semibold tracking-tight">
                            {text(offering.title, locale)}
                          </h2>
                          <span
                            className={
                              offering.status === "published"
                                ? "rounded-full px-2 py-0.5 text-xs font-semibold badge-confirmed"
                                : "rounded-full px-2 py-0.5 text-xs font-semibold badge-neutral"
                            }
                          >
                            {offering.status === "published"
                              ? servicesCopy.statusPublished[locale]
                              : servicesCopy.statusDraft[locale]}
                          </span>
                        </div>
                        {summary ? (
                          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">
                            {summary}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                          <span>
                            <span className="text-muted">
                              {servicesCopy.priceField[locale]}
                              {colon}
                            </span>
                            {offering.price_cents ? money(offering.price_cents) : "—"}
                          </span>
                          <span>
                            <span className="text-muted">
                              {servicesCopy.depositField[locale]}
                              {colon}
                            </span>
                            {offering.deposit_cents ? money(offering.deposit_cents) : "—"}
                          </span>
                          <span>
                            <span className="text-muted">
                              {servicesCopy.durationField[locale]}
                              {colon}
                            </span>
                            {offering.duration_min
                              ? formatCopy(servicesCopy.minutes[locale], {
                                  n: offering.duration_min,
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline !min-h-[2.35rem] !px-3 !text-xs"
                        onClick={() => setEditing(offering)}
                      >
                        <Pencil size={13} aria-hidden="true" />
                        {servicesCopy.editVerb[locale]}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card p-6 text-sm text-muted">{servicesCopy.empty[locale]}</div>
      )}

      {editing ? (
        <ServiceWizard
          offering={editing}
          locale={locale}
          singularLabel={singularLabel}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setEditing(null);
            setSavedNotice(text(updated.title, locale, servicesCopy.untitled[locale]));
          }}
        />
      ) : null}
    </>
  );
}
