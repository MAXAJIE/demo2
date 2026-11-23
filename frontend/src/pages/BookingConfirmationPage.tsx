import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { PageMeta } from "../components/site/PageMeta";
import { ConfirmationSkeleton } from "../components/site/Skeletons";
import { WhatsAppIcon } from "../components/site/WhatsAppIcon";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ApiError, cancelBooking, fetchBooking, subscribeBookings, uploadProof } from "../lib/api";
import { cn, formatDateLong, formatTime, money, safeHttpUrl, text } from "../lib/utils";

export function BookingConfirmationPage() {
  const { ref = "" } = useParams();
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token") ?? "";
  const { bundle, locale, t } = useTenant();
  const { t: translate } = useTranslation();
  const queryClient = useQueryClient();
  const [copyState, setCopyState] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [proofMessage, setProofMessage] = useState("");
  const [proofError, setProofError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return subscribeBookings(() => {
      void queryClient.invalidateQueries({ queryKey: ["booking", ref, token] });
    });
  }, [queryClient, ref, token]);

  const query = useQuery({
    queryKey: ["booking", ref, token],
    queryFn: () => fetchBooking(ref, token),
    enabled: Boolean(ref && token),
    retry: (failureCount, error) =>
      failureCount < 1 && (!(error instanceof ApiError) || error.status >= 500),
    refetchInterval: (queryState) =>
      queryState.state.data?.booking.status === "pending" ? 30_000 : false,
  });

  const cancel = useMutation({
    mutationFn: () => cancelBooking(ref, token),
    onSuccess: (data) => {
      queryClient.setQueryData(["booking", ref, token], data);
      setCancelError("");
    },
    onError: () => setCancelError(translate("common.errorBody")),
  });

  if (!ref || !token) {
    return (
      <div className="container-content py-24 text-center">
        <h1 className="font-display text-3xl font-bold">{translate("confirm.notFound")}</h1>
        <Link className="btn btn-primary mt-6" to="/">
          {translate("confirm.back")}
        </Link>
      </div>
    );
  }

  if (query.isLoading) {
    return <ConfirmationSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="container-content flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="text-muted" size={26} aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl font-bold">{translate("confirm.notFound")}</h1>
        <Link className="btn btn-primary mt-6" to="/book">
          {translate("confirm.viewBookings")}
        </Link>
      </div>
    );
  }

  const { booking, whatsapp_url } = query.data;
  const status = booking.status;
  const active = status === "pending" || status === "confirmed";
  const payment = bundle.site.payment;
  const deposit = booking.deposit_cents ?? 0;

  const title =
    status === "confirmed"
      ? translate("confirm.confirmedTitle")
      : status === "cancelled"
        ? translate("confirm.cancelledTitle")
        : status === "declined"
          ? translate("confirm.declinedTitle")
          : translate("confirm.pendingTitle");

  const body =
    status === "confirmed"
      ? translate("confirm.confirmedBody")
      : status === "cancelled"
        ? translate("confirm.cancelledBody")
        : status === "declined"
          ? translate("confirm.declinedBody")
          : translate("confirm.pendingBody");

  const statusIcon =
    status === "confirmed" ? (
      <CheckCircle2 size={26} aria-hidden="true" />
    ) : status === "pending" ? (
      <Clock3 size={26} aria-hidden="true" />
    ) : (
      <XCircle size={26} aria-hidden="true" />
    );

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(label);
      window.setTimeout(() => setCopyState(""), 1800);
    } catch {
      setCopyState("");
    }
  };


  const handleProof = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProofError("");
    setProofMessage("");
    try {
      await uploadProof(ref, token, file);
      setProofMessage(translate("confirm.uploaded"));
    } catch {
      setProofError(translate("confirm.uploadError"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const bankRows = [
    { label: translate("confirm.bank"), value: payment.bank_name },
    { label: translate("confirm.account"), value: payment.account_number },
    { label: translate("confirm.holder"), value: payment.account_holder },
  ].filter((row) => row.value);

  return (
    <>
      <PageMeta title={title} description={`${booking.ref} · ${title}`} noindex />

      <section className="border-b border-line">
        <div className="container-content py-10 md:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {translate("confirm.back")}
          </Link>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border",
                  status === "confirmed"
                    ? "badge-confirmed"
                    : status === "pending"
                      ? "badge-pending"
                      : status === "declined"
                        ? "badge-danger"
                        : "badge-neutral",
                )}
              >
                {statusIcon}
              </span>
              <div>
                <h1 className="display text-[clamp(2.2rem,4.6vw,3.4rem)]">{title}</h1>
                <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">{body}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-semibold text-muted">
                {translate("confirm.ref")}
              </span>
              <span className="rounded-control border border-line bg-surface px-3 py-2 font-mono text-sm font-semibold">
                {booking.ref}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container-content grid gap-8 py-10 md:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <div className="space-y-5">
          <section className="card p-6 md:p-7">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {translate("booking.summary")}
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-6">
                <dt className="text-muted">{translate("confirm.when")}</dt>
                <dd className="max-w-[62%] text-right font-medium">
                  {formatDateLong(booking.starts_at, locale, bundle.site.timezone)}
                  <br />
                  <span className="text-muted">
                    {formatTime(booking.starts_at, locale, bundle.site.timezone)} –{" "}
                    {formatTime(booking.ends_at, locale, bundle.site.timezone)}
                  </span>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-muted">{translate("confirm.service")}</dt>
                <dd className="max-w-[62%] text-right font-medium">
                  {booking.offering ? t(booking.offering.title) : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-muted">{translate("admin.status")}</dt>
                <dd>
                  <StatusBadge status={status} />
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6 border-t border-line pt-4">
                <dt className="text-muted">{translate("confirm.deposit")}</dt>
                <dd className="font-semibold">
                  {deposit ? money(deposit) : translate("confirm.noDeposit")}
                </dd>
              </div>
            </dl>
          </section>

          {active && whatsapp_url ? (
            <section className="card p-6 md:p-7">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {translate("confirm.whatsapp")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {translate("confirm.whatsappNote")}
              </p>
              <a
                className="btn btn-whatsapp mt-4 w-full sm:w-auto"
                href={whatsapp_url}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {translate("confirm.whatsapp")}
              </a>
            </section>
          ) : null}

          {active && deposit > 0 ? (
            <section className="card p-6 md:p-7">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {translate("confirm.paymentTitle")}
              </h2>

              {payment.configured ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {translate("confirm.paymentBody", { amount: deposit / 100 })}
                  </p>
                  {payment.qr_image_url ? (
                    <div className="mt-5 flex flex-col items-center rounded-control border border-line bg-page p-4">
                      <img
                        src={payment.qr_image_url}
                        alt="DuitNow QR"
                        className="h-48 w-48 object-contain"
                        loading="lazy"
                      />
                      <p className="mt-2 text-xs font-semibold text-muted">
                        DuitNow QR
                      </p>
                    </div>
                  ) : null}

                  {bankRows.length ? (
                    <dl className="mt-5 divide-y divide-line rounded-control border border-line text-sm">
                      {bankRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                          <dt className="text-muted">{row.label}</dt>
                          <dd className="flex items-center gap-2 font-medium">
                            {row.value}
                            <button
                              type="button"
                              className="text-muted transition hover:text-ink"
                              onClick={() => void copy(row.label, row.value)}
                              aria-label={`${translate("common.copy")} ${row.label}`}
                            >
                              {copyState === row.label ? (
                                <Check size={14} aria-hidden="true" />
                              ) : (
                                <Copy size={14} aria-hidden="true" />
                              )}
                            </button>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  <div className="mt-5">
                    <label className="btn btn-outline w-full cursor-pointer sm:w-auto">
                      {uploading ? (
                        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload size={15} aria-hidden="true" />
                      )}
                      {translate("confirm.upload")}
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(event) => void handleProof(event)}
                        disabled={uploading}
                      />
                    </label>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      {translate("confirm.uploadNote")}
                    </p>
                    {proofMessage ? (
                      <p className="mt-2 text-xs font-medium text-[color:var(--success)]">
                        {proofMessage}
                      </p>
                    ) : null}
                    {proofError ? (
                      <p className="mt-2 text-xs text-[color:var(--danger)]">{proofError}</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {translate("confirm.paymentPending")}
                </p>
              )}
            </section>
          ) : null}

          {active ? (
            <section className="rounded-card border border-line bg-surface p-6 md:p-7">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {translate("confirm.cancel")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {translate("confirm.cancelHint")}
              </p>
              {cancelError ? <p className="mt-2 text-xs badge-danger">{cancelError}</p> : null}
              {confirmingCancel ? (
                <div className="mt-4 rounded-control border border-line bg-page p-4">
                  <p className="text-sm font-medium">{translate("confirm.cancelConfirm")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline !min-h-[2.5rem]"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={cancel.isPending}
                    >
                      {translate("confirm.keep")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger !min-h-[2.5rem]"
                      onClick={() => cancel.mutate()}
                      disabled={cancel.isPending}
                    >
                      {cancel.isPending
                        ? translate("confirm.cancelling")
                        : translate("confirm.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger mt-4"
                  onClick={() => setConfirmingCancel(true)}
                >
                  {translate("confirm.cancel")}
                </button>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="card p-6 md:p-7">
            <p className="eyebrow text-muted">{translate("footer.visit")}</p>
            <address className="mt-3 not-italic font-display text-[1.05rem] font-semibold leading-snug tracking-tight">
              {text(bundle.site.contact.address, locale)}
            </address>
            <a
              className="mt-4 inline-flex text-xs font-semibold underline decoration-line underline-offset-4 hover:no-underline"
              href={safeHttpUrl(bundle.site.contact.map_url)}
              target="_blank"
              rel="noreferrer"
            >
              {translate("common.openInMaps")}
            </a>
            <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              {text(bundle.site.contact.opening_hours, locale)}
            </p>
          </div>

          <div className="rounded-card border border-line bg-surface p-6">
            <p className="text-xs leading-relaxed text-muted">{translate("footer.medicalNote")}</p>
          </div>

          <Link className="btn btn-outline w-full" to="/book">
            {translate("confirm.viewBookings")}
          </Link>
        </aside>
      </div>
    </>
  );
}
