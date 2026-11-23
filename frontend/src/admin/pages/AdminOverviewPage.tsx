import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Inbox, Sparkles, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { StatusBadge, LeadStatusBadge } from "../../components/ui/StatusBadge";
import { adminOverview } from "../../lib/api";
import { formatDateTime, text as pick } from "../../lib/utils";
import { AdminPageHeader } from "./AdminLayout";

export function AdminOverviewPage() {
  const { bundle, locale } = useTenant();
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["admin-overview"], queryFn: adminOverview });

  const counts = query.data?.counts;
  const cards = [
    { label: t("admin.pending"), value: counts?.pending_bookings ?? 0, icon: Timer },
    { label: t("admin.today"), value: counts?.today_bookings ?? 0, icon: CalendarDays },
    { label: t("admin.newLeads"), value: counts?.new_leads ?? 0, icon: Inbox },
    { label: t("admin.publishedServices"), value: counts?.published_offerings ?? 0, icon: Sparkles },
  ];

  return (
    <>
      <AdminPageHeader
        title={t("admin.overview")}
        description={pick(bundle.site.brand_name, locale)}
        action={
          <Link to="/" className="btn btn-outline !min-h-[2.5rem] !text-xs">
            {t("admin.viewSite")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      {query.isError ? (
        <div className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          {t("admin.error")}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted">
                  {card.label}
                </p>
                <Icon size={15} className="text-muted" aria-hidden="true" />
              </div>
              <p className="mt-3 font-display text-[2rem] font-bold leading-none tracking-tight">
                {query.isLoading ? <span className="skeleton inline-block h-8 w-10" /> : card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {t("admin.upcoming")}
            </h2>
            <Link to="/bookings" className="text-xs font-semibold text-muted hover:text-ink">
              {t("admin.bookings")}
            </Link>
          </div>
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
            </div>
          ) : query.data?.upcoming.length ? (
            <ul className="divide-y divide-line">
              {query.data.upcoming.map((booking) => (
                <li key={booking.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{booking.customer_name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {booking.offering ? pick(booking.offering.title, locale) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDateTime(booking.starts_at, locale, bundle.site.timezone)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={booking.status} />
                    <p className="mt-1 font-mono text-xs text-muted">{booking.ref}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">{t("admin.noUpcoming")}</p>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {t("admin.latestLeads")}
            </h2>
            <Link to="/leads" className="text-xs font-semibold text-muted hover:text-ink">
              {t("admin.leads")}
            </Link>
          </div>
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          ) : query.data?.latest_leads.length ? (
            <ul className="divide-y divide-line">
              {query.data.latest_leads.map((lead) => (
                <li key={lead.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{lead.name}</p>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                    {lead.message}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">{t("admin.noLeads")}</p>
          )}
        </section>
      </div>
    </>
  );
}
