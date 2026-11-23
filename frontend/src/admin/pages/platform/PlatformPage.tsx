import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, LogOut, RefreshCw, ShieldAlert } from "lucide-react";

import { useTenant } from "../../../app/tenant-context";
import { BrandBlock } from "../../../components/site/Logo";
import {
  ApiError,
  adminLogout,
  adminSession,
  getAdminToken,
  platformOverview,
  setAdminToken,
} from "../../../lib/api";
import { cn, text as pick } from "../../../lib/utils";
import type { PlatformTenant } from "../../../types";
import { AdminPageHeader } from "../AdminLayout";
import { PlatformInvites } from "./PlatformInvites";
import { PlatformMembers } from "./PlatformMembers";
import { platformText, type PlatformCopyKey } from "./copy";

function tenantStatusClass(status: string): string {
  if (status === "active" || status === "published") return "badge-confirmed";
  if (status === "suspended" || status === "archived") return "badge-danger";
  return "badge-neutral";
}

export function PlatformPage() {
  const { bundle, locale } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const t = (key: PlatformCopyKey) => platformText(key, locale);
  const token = getAdminToken();

  const session = useQuery({
    queryKey: ["admin-session"],
    queryFn: adminSession,
    enabled: Boolean(token),
    retry: false,
  });

  // Both tiers share the same auth: no session, no console.
  useEffect(() => {
    if (!token || session.isError) {
      setAdminToken(null);
      navigate("/login?next=/platform", { replace: true });
    }
  }, [navigate, session.isError, token]);

  const overview = useQuery({
    queryKey: ["platform-overview"],
    queryFn: platformOverview,
    enabled: Boolean(token) && session.isSuccess,
    retry: false,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await adminLogout();
    } catch {
      // Token may already be expired.
    }
    setAdminToken(null);
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const brand = pick(bundle.site.brand_name, locale);
  const tenants = overview.data?.tenants ?? [];
  const noAccess = overview.error instanceof ApiError && overview.error.status === 403;
  const unsupported =
    overview.error instanceof ApiError &&
    (overview.error.status === 501 || overview.error.code === "platform_unavailable");

  if (!token || session.isLoading || session.isError) {
    return (
      <div className="min-h-screen bg-page">
        <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-10 md:px-8">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <Helmet>
        <meta name="robots" content="noindex" />
        <title>{`${t("title")} · ${brand}`}</title>
      </Helmet>

      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link to="/" className="min-w-0">
            <BrandBlock name={brand} location={t("title")} wrapName />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              aria-label={t("backToWorkspace")}
              className="btn btn-outline !min-h-[2.25rem] !px-3 !text-xs"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{t("backToWorkspace")}</span>
            </Link>
            <button
              type="button"
              aria-label={t("signOut")}
              onClick={() => void signOut()}
              disabled={signingOut}
              className="btn btn-outline !min-h-[2.25rem] !px-3 !text-xs"
            >
              {signingOut ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <LogOut size={14} aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{t("signOut")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-7 md:px-8 md:py-10">
        <AdminPageHeader title={t("title")} description={t("subtitle")} />

        {overview.isLoading ? (
          <div className="space-y-4">
            <div className="skeleton h-56 w-full" />
            <div className="skeleton h-72 w-full" />
          </div>
        ) : noAccess ? (
          <section className="card p-6 md:p-8">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {t("noAccessTitle")}
                </h2>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
                  {t("noAccessBody")}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary !min-h-[2.5rem] !text-xs"
                    onClick={() => void signOut()}
                    disabled={signingOut}
                  >
                    {signingOut ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut size={14} aria-hidden="true" />
                    )}
                    {t("signOut")}
                  </button>
                  <Link to="/" className="btn btn-outline !min-h-[2.5rem] !text-xs">
                    <ArrowLeft size={14} aria-hidden="true" />
                    {t("backToWorkspace")}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : overview.isError ? (
          <section className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t("overviewError")}
            </h2>
            {unsupported ? (
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
                {t("unsupported")}
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn-outline mt-5 !min-h-[2.5rem] !text-xs"
              onClick={() => void overview.refetch()}
            >
              <RefreshCw size={14} aria-hidden="true" />
              {t("retry")}
            </button>
          </section>
        ) : (
          <div className="space-y-6">
            <TenantsSection tenants={tenants} />
            <PlatformInvites tenants={tenants} />
            <PlatformMembers tenants={tenants} />
          </div>
        )}
      </main>
    </div>
  );
}

function TenantsSection({ tenants }: { tenants: PlatformTenant[] }) {
  const { locale } = useTenant();
  const t = (key: PlatformCopyKey) => platformText(key, locale);

  const brandName = (tenant: PlatformTenant): string =>
    pick(tenant.brand_name ?? undefined, locale, tenant.slug);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight">
          {t("tenantsTitle")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("tenantsHint")}</p>
      </div>

      {tenants.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">{t("noTenants")}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="table-clinic w-full min-w-[720px]">
              <thead>
                <tr>
                  <th>{t("brand")}</th>
                  <th>{t("plan")}</th>
                  <th>{t("status")}</th>
                  <th className="text-right">{t("pendingBookings")}</th>
                  <th className="text-right">{t("newLeads")}</th>
                  <th className="text-right">{t("publishedServices")}</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <p className="text-sm font-semibold">{brandName(tenant)}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">{tenant.slug}</p>
                    </td>
                    <td className="whitespace-nowrap text-sm capitalize">{tenant.plan}</td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
                          tenantStatusClass(tenant.status),
                        )}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="text-right text-sm tabular-nums">{tenant.pending_bookings}</td>
                    <td className="text-right text-sm tabular-nums">{tenant.new_leads}</td>
                    <td className="text-right text-sm tabular-nums">
                      {tenant.published_offerings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {tenants.map((tenant) => (
              <li key={tenant.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{brandName(tenant)}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">{tenant.slug}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
                      tenantStatusClass(tenant.status),
                    )}
                  >
                    {tenant.status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-muted">{t("plan")}</dt>
                    <dd className="font-semibold capitalize">{tenant.plan}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("pendingBookings")}</dt>
                    <dd className="font-semibold tabular-nums">{tenant.pending_bookings}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("newLeads")}</dt>
                    <dd className="font-semibold tabular-nums">{tenant.new_leads}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("publishedServices")}</dt>
                    <dd className="font-semibold tabular-nums">{tenant.published_offerings}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
