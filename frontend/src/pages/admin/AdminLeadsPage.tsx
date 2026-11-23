import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, MessageCircle, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { LeadStatusBadge } from "../../components/ui/StatusBadge";
import { adminLeads, adminUpdateLead } from "../../lib/api";
import { cn, formatDateTime } from "../../lib/utils";
import type { AdminLead } from "../../types";
import { AdminPageHeader } from "./AdminLayout";

const filters = ["all", "new", "contacted", "closed"] as const;

function LeadCard({ lead }: { lead: AdminLead }) {
  const { bundle, locale } = useTenant();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(lead.internal_notes);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (body: { status?: string; internal_notes?: string }) =>
      adminUpdateLead(lead.id, body),
    onSuccess: () => {
      setSaved(true);
      setError("");
      window.setTimeout(() => setSaved(false), 1800);
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => setError(t("admin.error")),
  });

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-display text-base font-semibold tracking-tight">{lead.name}</h3>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {lead.contact_masked} · {formatDateTime(lead.created_at, locale, bundle.site.timezone)}
          </p>
          <p className="mt-1 font-mono text-xs text-muted">{lead.ref}</p>
        </div>
        <select
          value={lead.status}
          aria-label={t("admin.status")}
          onChange={(event) => mutation.mutate({ status: event.target.value })}
          className="field !min-h-[2.35rem] !w-auto !py-1.5 text-xs"
          disabled={mutation.isPending}
        >
          <option value="new">{t("admin.statusNew")}</option>
          <option value="contacted">{t("admin.statusContacted")}</option>
          <option value="closed">{t("admin.statusClosed")}</option>
        </select>
      </div>

      <div className="px-5 py-4">
        <p className="whitespace-pre-line text-sm leading-relaxed">{lead.message}</p>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
          <MessageCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t("admin.contact")}: {lead.contact_masked}
        </p>
      </div>

      <details className="group border-t border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-xs font-semibold text-muted [&::-webkit-details-marker]:hidden">
          {t("admin.internalNotes")}
          <ChevronDown
            size={14}
            className="transition group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="px-5 pb-5">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="field resize-y text-sm"
            placeholder={t("admin.notesPlaceholder")}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="btn btn-primary !min-h-[2.3rem] !px-3 !text-xs"
              onClick={() => mutation.mutate({ internal_notes: notes })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <Save size={13} aria-hidden="true" />
              )}
              {mutation.isPending ? t("admin.saving") : t("admin.saveNotes")}
            </button>
            {saved ? (
              <span className="text-xs font-medium text-[color:var(--success)]">
                {t("admin.saved")}
              </span>
            ) : null}
            {error ? (
              <span className="text-xs text-[color:var(--danger)]">{error}</span>
            ) : null}
          </div>
        </div>
      </details>
    </article>
  );
}

export function AdminLeadsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const query = useQuery({
    queryKey: ["admin-leads", filter],
    queryFn: () => adminLeads(filter),
  });

  return (
    <>
      <AdminPageHeader title={t("admin.inbox")} />

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {filters.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              filter === value
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {value === "all"
              ? t("admin.all")
              : value === "new"
                ? t("admin.statusNew")
                : value === "contacted"
                  ? t("admin.statusContacted")
                  : t("admin.statusClosed")}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      ) : query.isError ? (
        <div className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          {t("admin.error")}
        </div>
      ) : query.data?.leads.length ? (
        <div className="space-y-3">
          {query.data.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center text-sm text-muted">{t("admin.noLeads")}</div>
      )}
    </>
  );
}
