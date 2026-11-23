import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarDays,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { BrandBlock } from "../../components/site/Logo";
import {
  adminLogout,
  adminSession,
  getAdminToken,
  platformOverview,
  setAdminToken,
} from "../../lib/api";
import { cn } from "../../lib/utils";
import type { Locale } from "../../types";

const nav = [
  { to: "/", end: true, key: "admin.overview", icon: LayoutDashboard },
  { to: "/bookings", key: "admin.bookings", icon: CalendarDays },
  { to: "/calendar", key: "admin.calendar", icon: CalendarClock },
  { to: "/leads", key: "admin.leads", icon: Inbox },
  { to: "/services", key: "admin.services", icon: Sparkles },
  { to: "/settings", key: "admin.settings", icon: Settings },
] as const;

const platformConsoleLabel: Record<Locale, string> = {
  en: "Platform console",
  ms: "Konsol platform",
  zh: "平台控制台",
};

export function AdminLayout() {
  const { bundle, locale } = useTenant();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  // The rail is icon-only until hovered; while hovered the work area blurs.
  const [railOpen, setRailOpen] = useState(false);
  const token = getAdminToken();

  const session = useQuery({
    queryKey: ["admin-session"],
    queryFn: adminSession,
    enabled: Boolean(token),
    retry: false,
  });

  // Tier 2 access is decided by the platform RPC, not by the token alone: the
  // link only appears when the overview actually resolves.
  const platform = useQuery({
    queryKey: ["platform-overview"],
    queryFn: platformOverview,
    enabled: Boolean(token) && session.isSuccess,
    retry: false,
  });
  const showPlatform = platform.isSuccess;

  useEffect(() => {
    if (session.isError) {
      setAdminToken(null);
      navigate("/login", { replace: true });
    }
  }, [navigate, session.isError]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  if (!token) return <Navigate to="/login" replace />;

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

  const brand = bundle.site.brand_name[locale] || bundle.site.brand_name.en;
  const locationLabel = locale === "zh" ? "前台管理" : "Front desk";
  const sectionKey =
    nav.find((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)))
      ?.key ?? "admin.overview";

  return (
    <div className="min-h-screen bg-page">
      <Helmet>
        <meta name="robots" content="noindex" />
        <title>{`${t(sectionKey)} · ${brand}`}</title>
      </Helmet>

      <aside
        onMouseEnter={() => setRailOpen(true)}
        onMouseLeave={() => setRailOpen(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-brand text-on-brand transition-[width] duration-300 ease-out lg:flex",
          railOpen ? "w-64" : "w-[4.5rem]",
        )}
      >
        <div className={cn("border-b border-white/10", railOpen ? "px-6 py-5" : "px-3 py-5 text-center")}>
          {railOpen ? (
            <BrandBlock name={brand} location={locationLabel} wrapName />
          ) : (
            <span className="font-display text-lg font-semibold tracking-tight">
              {(brand[0] ?? "C").toUpperCase()}
            </span>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label={t("admin.navLabel")}>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-control py-2.5 text-sm font-medium transition",
                    railOpen ? "px-3.5" : "justify-center px-0",
                    isActive
                      ? "bg-white/10 text-on-brand"
                      : "text-on-brand/60 hover:bg-white/5 hover:text-on-brand",
                  )
                }
              >
                <Icon size={17} aria-hidden="true" />
                <span className={cn("truncate transition-opacity duration-150", railOpen ? "opacity-100" : "hidden")}>
                  {t(item.key)}
                </span>
              </NavLink>
            );
          })}
          {showPlatform ? (
            <div className="mt-1 border-t border-white/10 pt-2">
              <Link
                to="/platform"
                className={cn(
                  "flex items-center gap-3 rounded-control py-2.5 text-sm font-medium text-on-brand/60 transition hover:bg-white/5 hover:text-on-brand",
                  railOpen ? "px-3.5" : "justify-center px-0",
                )}
              >
                <ShieldCheck size={17} aria-hidden="true" />
                <span className={cn("truncate", railOpen ? "opacity-100" : "hidden")}>
                  {platformConsoleLabel[locale]}
                </span>
              </Link>
            </div>
          ) : null}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-control py-2.5 text-sm text-on-brand/60 transition hover:bg-white/5 hover:text-on-brand",
              railOpen ? "px-3.5" : "justify-center px-0",
            )}
          >
            <ExternalLink size={17} aria-hidden="true" />
            <span className={cn("truncate", railOpen ? "opacity-100" : "hidden")}>{t("admin.viewSite")}</span>
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-control py-2.5 text-left text-sm text-on-brand/60 transition hover:bg-white/5 hover:text-on-brand disabled:opacity-50",
              railOpen ? "px-3.5" : "justify-center px-0",
            )}
          >
            <LogOut size={17} aria-hidden="true" />
            <span className={cn("truncate", railOpen ? "opacity-100" : "hidden")}>{t("admin.signOut")}</span>
          </button>
        </div>
      </aside>

      <div className={cn("lg:pl-[4.5rem] backstage-main", railOpen && "backstage-focus")}>
        <header className="sticky top-0 z-30 border-b border-line bg-page lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold">{brand}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {locationLabel}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium"
            >
              <LogOut size={13} aria-hidden="true" />
              {t("admin.signOut")}
            </button>
          </div>
          <nav
            className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2"
            aria-label={t("admin.mobileNav")}
          >
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition",
                    isActive ? "bg-brand text-on-brand" : "bg-surface text-muted",
                  )
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
            {showPlatform ? (
              <Link
                to="/platform"
                className="shrink-0 rounded-full bg-surface px-3.5 py-2 text-xs font-medium text-muted"
              >
                {platformConsoleLabel[locale]}
              </Link>
            ) : null}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-7 md:px-8 md:py-10">
          {session.isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-9 w-56" />
              <div className="skeleton h-40 w-full" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.7rem] font-bold tracking-tight md:text-[2rem]">
          {title}
        </h1>
        {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
