import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { BrandBlock } from "../../components/site/Logo";
import { adminClaimInvite, adminLogin, getAdminToken, setAdminToken } from "../../lib/api";
import { displayClock, text } from "../../lib/utils";
import type { Locale } from "../../types";

const inviteCopy = {
  hint: {
    en: "You were invited. Sign in with the email address that received the invitation.",
    ms: "Anda telah dijemput. Log masuk dengan alamat e-mel yang menerima jemputan itu.",
    zh: "你收到邀请。请使用收到邀请的电邮地址登录。",
  },
  invalid: {
    en: "This invitation is not valid or has expired. Ask the owner for a new link.",
    ms: "Jemputan ini tidak sah atau telah tamat tempoh. Minta pautan baharu daripada pemilik.",
    zh: "此邀请无效或已过期。请向负责人索取新的链接。",
  },
  continue: {
    en: "Continue to the front desk",
    ms: "Teruskan ke kaunter hadapan",
    zh: "前往前台",
  },
} satisfies Record<string, Record<Locale, string>>;

/** Only same-origin paths are honoured, so `next` cannot become an open redirect. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/manage";
  if (value.startsWith("/manage/login")) return "/manage";
  return value;
}

export function AdminLoginPage() {
  const { bundle, locale } = useTenant();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = (searchParams.get("invite") ?? "").trim();
  const destination = safeNext(searchParams.get("next"));
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");

  const mutation = useMutation({
    mutationFn: () => adminLogin(identifier, password),
    onSuccess: async (data) => {
      setAdminToken(data.token);
      if (inviteToken) {
        try {
          await adminClaimInvite(inviteToken);
        } catch {
          // Signed in, but the invite itself is unusable: keep the user on the
          // page so the reason is visible, and let them continue manually.
          setInviteError(inviteCopy.invalid[locale]);
          return;
        }
      }
      navigate(destination, { replace: true });
    },
    onError: () => setError(t("admin.invalid")),
  });

  if (getAdminToken() && !inviteError) return <Navigate to={destination} replace />;

  const brand = text(bundle.site.brand_name, locale);
  const contact = bundle.site.contact;

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <Helmet>
        <meta name="robots" content="noindex" />
        <title>{`${t("admin.signInTitle")} · ${brand}`}</title>
      </Helmet>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-card border border-line bg-surface shadow-lift lg:grid-cols-[0.9fr_1.1fr]">
        <div className="section-dark relative overflow-hidden p-8 md:p-10">
          <svg
            viewBox="0 0 300 300"
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 opacity-10"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="150" cy="150" r="130" />
            <circle cx="150" cy="150" r="85" />
            <circle cx="150" cy="150" r="40" />
          </svg>
          <BrandBlock name={brand} location={locale === "zh" ? "前台管理" : "Front desk"} />
          <h1 className="display mt-10 max-w-[12ch] text-[clamp(2rem,4vw,3rem)]">
            {t("admin.signInTitle")}
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-relaxed mute-dark">{t("admin.signInBody")}</p>

          <dl className="mt-10 space-y-4 border-t line-dark pt-6 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] mute-dark">
                {t("footer.hours")}
              </dt>
              <dd className="mt-1 text-on-brand">{text(contact.opening_hours, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] mute-dark">
                {t("status.lastSlot", {
                  time: displayClock(contact.last_appointment || "22:30", locale),
                })}
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-xs mute-dark">
                <LockKeyhole size={13} aria-hidden="true" />
                {t("booking.secureNote")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="p-8 md:p-10">
          {inviteToken ? (
            <div className="mb-4 rounded-control border border-line bg-page px-4 py-3 text-xs leading-relaxed text-muted">
              {inviteCopy.hint[locale]}
            </div>
          ) : null}

          {inviteError ? (
            <div role="alert" className="mb-4 rounded-control p-3 text-xs badge-danger">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {inviteError}
              </div>
              <Link
                to={destination}
                className="mt-2 inline-flex font-semibold underline decoration-line underline-offset-4 hover:no-underline"
              >
                {inviteCopy.continue[locale]}
              </Link>
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              mutation.mutate();
            }}
            className="space-y-4"
            noValidate
          >
            <div>
              <label className="label" htmlFor="admin_identifier">
                {t("admin.identifier")}
              </label>
              <input
                id="admin_identifier"
                className="field"
                autoComplete="username"
                placeholder={t("admin.identifierPlaceholder")}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="admin_password">
                {t("admin.password")}
              </label>
              <input
                id="admin_password"
                type="password"
                className="field"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div role="alert" className="flex items-start gap-2 rounded-control p-3 text-xs badge-danger">
                <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={mutation.isPending || !identifier || !password}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  {t("admin.signingIn")}
                </>
              ) : (
                <>
                  {t("admin.signIn")}
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {import.meta.env.DEV ? (
            <div className="mt-6 rounded-control border border-line bg-page px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Demo
              </p>
              <p className="mt-1 font-mono text-xs text-muted">{t("admin.demoHint")}</p>
            </div>
          ) : null}

          <a
            className="mt-6 inline-flex text-xs font-semibold underline decoration-line underline-offset-4 hover:no-underline"
            href="/"
          >
            {t("admin.viewSite")}
          </a>
        </div>
      </div>
    </div>
  );
}
