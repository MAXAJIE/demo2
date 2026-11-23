import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { adminOfferings, adminUpdateOffering } from "../../lib/api";
import { money, text as pick } from "../../lib/utils";
import type { Offering } from "../../types";
import { AdminPageHeader } from "./AdminLayout";

type EditState = {
  title_en: string;
  title_zh: string;
  summary_en: string;
  summary_zh: string;
  price: string;
  deposit: string;
  note_en: string;
  note_zh: string;
  status: string;
};

function toEditState(offering: Offering): EditState {
  return {
    title_en: offering.title.en ?? "",
    title_zh: offering.title.zh ?? "",
    summary_en: offering.summary.en ?? "",
    summary_zh: offering.summary.zh ?? "",
    price: offering.price_cents ? String(offering.price_cents / 100) : "",
    deposit: offering.deposit_cents ? String(offering.deposit_cents / 100) : "",
    note_en: offering.price_note.en ?? "",
    note_zh: offering.price_note.zh ?? "",
    status: offering.status,
  };
}

function EditDialog({
  offering,
  onClose,
}: {
  offering: Offering;
  onClose: () => void;
}) {
  const { locale } = useTenant();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [state, setState] = useState<EditState>(() => toEditState(offering));
  const [error, setError] = useState("");

  useEffect(() => {
    setState(toEditState(offering));
  }, [offering]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () =>
      adminUpdateOffering(offering.id, {
        title: { en: state.title_en, zh: state.title_zh },
        summary: { en: state.summary_en, zh: state.summary_zh },
        price_note: { en: state.note_en, zh: state.note_zh },
        price_cents: state.price.trim() === "" ? null : Math.round(Number(state.price) * 100),
        deposit_cents: state.deposit.trim() === "" ? null : Math.round(Number(state.deposit) * 100),
        status: state.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-offerings"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant"] });
      onClose();
    },
    onError: () => setError(t("admin.error")),
  });

  const set =
    (key: keyof EditState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setState((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-offering-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-card border border-line bg-page p-6 shadow-lift md:rounded-card md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-muted">{pick(offering.title, locale)}</p>
            <h2 id="edit-offering-title" className="mt-1 font-display text-xl font-bold tracking-tight">
              {t("admin.edit")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
            aria-label={t("admin.close")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="title_en">
                {t("admin.titleEn")}
              </label>
              <input id="title_en" className="field" value={state.title_en} onChange={set("title_en")} />
            </div>
            <div>
              <label className="label" htmlFor="title_zh">
                {t("admin.titleZh")}
              </label>
              <input id="title_zh" className="field" value={state.title_zh} onChange={set("title_zh")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="summary_en">
                {t("admin.summaryEn")}
              </label>
              <textarea
                id="summary_en"
                rows={3}
                className="field resize-y"
                value={state.summary_en}
                onChange={set("summary_en")}
              />
            </div>
            <div>
              <label className="label" htmlFor="summary_zh">
                {t("admin.summaryZh")}
              </label>
              <textarea
                id="summary_zh"
                rows={3}
                className="field resize-y"
                value={state.summary_zh}
                onChange={set("summary_zh")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="price">
                {t("admin.price")}
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="1"
                className="field"
                placeholder="—"
                value={state.price}
                onChange={set("price")}
              />
            </div>
            <div>
              <label className="label" htmlFor="deposit">
                {t("admin.deposit")}
              </label>
              <input
                id="deposit"
                type="number"
                min="0"
                step="1"
                className="field"
                value={state.deposit}
                onChange={set("deposit")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="note_en">
                {t("admin.priceNote")}
              </label>
              <input id="note_en" className="field" value={state.note_en} onChange={set("note_en")} />
            </div>
            <div>
              <label className="label" htmlFor="note_zh">
                {t("admin.priceNoteZh")}
              </label>
              <input id="note_zh" className="field" value={state.note_zh} onChange={set("note_zh")} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="offering_status">
              {t("admin.status")}
            </label>
            <select id="offering_status" className="field" value={state.status} onChange={set("status")}>
              <option value="published">{t("admin.published")}</option>
              <option value="draft">{t("admin.draft")}</option>
            </select>
          </div>

          {error ? <p className="rounded-control p-3 text-xs badge-danger">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t("admin.close")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("admin.saving") : t("admin.saveSettings")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminServicesPage() {
  const { bundle, locale } = useTenant();
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["admin-offerings"], queryFn: adminOfferings });
  const [editing, setEditing] = useState<Offering | null>(null);

  return (
    <>
      <AdminPageHeader title={t("admin.services")} description={t("admin.servicesHint")} />

      {query.isLoading ? (
        <div className="space-y-3">
          <div className="skeleton h-28 w-full" />
          <div className="skeleton h-28 w-full" />
          <div className="skeleton h-28 w-full" />
        </div>
      ) : query.isError ? (
        <div className="card p-6 text-sm text-muted">{t("admin.error")}</div>
      ) : (
        <div className="space-y-3">
          {query.data?.offerings.map((offering) => (
            <article key={offering.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold tracking-tight">
                      {pick(offering.title, locale)}
                    </h2>
                    <span
                      className={
                        offering.status === "published"
                          ? "rounded-full px-2 py-0.5 text-xs font-semibold badge-confirmed"
                          : "rounded-full px-2 py-0.5 text-xs font-semibold badge-neutral"
                      }
                    >
                      {offering.status === "published" ? t("admin.published") : t("admin.draft")}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">
                    {pick(offering.summary, locale)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <span>
                      <span className="text-muted">{t("admin.price")}: </span>
                      {offering.price_cents ? money(offering.price_cents) : "—"}
                    </span>
                    <span>
                      <span className="text-muted">{t("admin.deposit")}: </span>
                      {offering.deposit_cents ? money(offering.deposit_cents) : "—"}
                    </span>
                    <span>
                      <span className="text-muted">{t("service.duration")}: </span>
                      {offering.duration_min
                        ? t("common.minutes", { count: offering.duration_min })
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
                  {t("admin.edit")}
                </button>
              </div>
            </article>
          ))}
          <p className="pt-2 text-xs text-muted">{bundle.site.labels.offerings_plural?.[locale]}</p>
        </div>
      )}

      {editing ? <EditDialog offering={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
