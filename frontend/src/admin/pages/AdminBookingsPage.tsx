import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { adminBookings, adminUpdateBooking } from "../../lib/api";
import { cn, formatDateTime, money, text as pick } from "../../lib/utils";
import { AdminPageHeader } from "./AdminLayout";

const filters = ["all", "pending", "confirmed", "declined", "cancelled"] as const;

export function AdminBookingsPage() {
  const { bundle, locale } = useTenant();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const query = useQuery({
    queryKey: ["admin-bookings", filter],
    queryFn: () => adminBookings(filter),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; body: { status?: string; payment_verified?: boolean } }) =>
      adminUpdateBooking(input.id, input.body),
    onMutate: (input) => {
      setBusy(input.id);
      setError("");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => setError(t("admin.error")),
    onSettled: () => setBusy(""),
  });

  const update = (id: string, body: { status?: string; payment_verified?: boolean }) => {
    if (body.status === "cancelled" || body.status === "declined") {
      if (!window.confirm(t("admin.confirmCancel"))) return;
    }
    mutation.mutate({ id, body });
  };

  return (
    <>
      <AdminPageHeader title={t("admin.bookings")} description={t("admin.bookingsHint")} />

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {filters.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition",
              filter === value
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {t(`common.${value}`, { defaultValue: value })}
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" className="mb-4 rounded-control p-3 text-xs badge-danger">
          {error}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-3 p-5">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : query.data?.bookings.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="table-clinic w-full min-w-[860px]">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[19%]" />
                  <col className="w-[24%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t("admin.customer")}</th>
                    <th>{t("admin.when")}</th>
                    <th>{t("admin.service")}</th>
                    <th>{t("admin.status")}</th>
                    <th>{t("admin.payment")}</th>
                    <th className="text-right">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.bookings.map((booking) => {
                    const active = booking.status === "pending" || booking.status === "confirmed";
                    return (
                      <tr key={booking.id} className="align-top">
                        <td>
                          <p className="text-sm font-semibold">{booking.customer_name}</p>
                          <p className="mt-0.5 text-xs text-muted">{booking.customer_contact_masked}</p>
                          <p className="mt-1 font-mono text-xs text-muted">{booking.ref}</p>
                        </td>
                        <td className="whitespace-nowrap text-sm">
                          {formatDateTime(booking.starts_at, locale, bundle.site.timezone)}
                          <p className="mt-1 text-xs text-muted">
                            {t("admin.created")}
                            {locale === "zh" ? "：" : ": "}
                            {formatDateTime(booking.created_at, locale, bundle.site.timezone)}
                          </p>
                        </td>
                        <td className="max-w-[14rem] text-sm">
                          {booking.offering ? pick(booking.offering.title, locale) : "—"}
                        </td>
                        <td>
                          <StatusBadge status={booking.status} />
                        </td>
                        <td>
                          <div className="text-xs">
                            {booking.deposit_cents ? (
                              <>
                                <p className="font-semibold">{money(booking.deposit_cents)}</p>
                                <p className={booking.payment_verified ? "text-[color:var(--success)]" : "text-muted"}>
                                  {booking.payment_verified ? t("admin.paid") : t("admin.depositPending")}
                                </p>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {booking.status === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-primary !min-h-[2.1rem] !px-2.5 !text-xs"
                                  onClick={() => update(booking.id, { status: "confirmed" })}
                                  disabled={busy === booking.id}
                                >
                                  <Check size={12} aria-hidden="true" />
                                  {t("admin.approve")}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline !min-h-[2.1rem] !px-2.5 !text-xs"
                                  onClick={() => update(booking.id, { status: "declined" })}
                                  disabled={busy === booking.id}
                                >
                                  <X size={12} aria-hidden="true" />
                                  {t("admin.decline")}
                                </button>
                              </>
                            ) : null}
                            {booking.status === "confirmed" ? (
                              <button
                                type="button"
                                className="btn btn-outline !min-h-[2.1rem] !px-2.5 !text-xs"
                                onClick={() => update(booking.id, { status: "cancelled" })}
                                disabled={busy === booking.id}
                              >
                                {t("admin.cancel")}
                              </button>
                            ) : null}
                            {booking.deposit_cents && active ? (
                              <button
                                type="button"
                                className="btn btn-outline !min-h-[2.1rem] !px-2.5 !text-xs"
                                onClick={() =>
                                  update(booking.id, { payment_verified: !booking.payment_verified })
                                }
                                disabled={busy === booking.id}
                              >
                                {busy === booking.id ? (
                                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                                ) : (
                                  <CheckCheck size={12} aria-hidden="true" />
                                )}
                                {booking.payment_verified ? t("admin.markUnpaid") : t("admin.markPaid")}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {query.data.bookings.map((booking) => (
                <li key={booking.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{booking.customer_name}</p>
                      <p className="text-xs text-muted">{booking.customer_contact_masked}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="mt-3 text-sm">
                    {booking.offering ? pick(booking.offering.title, locale) : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(booking.starts_at, locale, bundle.site.timezone)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-mono text-xs text-muted">{booking.ref}</span>
                    {booking.deposit_cents ? (
                      <span
                        className={
                          booking.payment_verified ? "text-[color:var(--success)]" : "text-muted"
                        }
                      >
                        {money(booking.deposit_cents)} ·{" "}
                        {booking.payment_verified ? t("admin.paid") : t("admin.depositPending")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {booking.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary !min-h-[2.2rem] !px-3 !text-xs"
                          onClick={() => update(booking.id, { status: "confirmed" })}
                        >
                          {t("admin.approve")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline !min-h-[2.2rem] !px-3 !text-xs"
                          onClick={() => update(booking.id, { status: "declined" })}
                        >
                          {t("admin.decline")}
                        </button>
                      </>
                    ) : null}
                    {booking.status === "confirmed" ? (
                      <button
                        type="button"
                        className="btn btn-outline !min-h-[2.2rem] !px-3 !text-xs"
                        onClick={() => update(booking.id, { status: "cancelled" })}
                      >
                        {t("admin.cancel")}
                      </button>
                    ) : null}
                    {booking.deposit_cents && (booking.status === "pending" || booking.status === "confirmed") ? (
                      <button
                        type="button"
                        className="btn btn-outline !min-h-[2.2rem] !px-3 !text-xs"
                        onClick={() =>
                          update(booking.id, { payment_verified: !booking.payment_verified })
                        }
                      >
                        {booking.payment_verified ? t("admin.markUnpaid") : t("admin.markPaid")}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="px-5 py-16 text-center text-sm text-muted">{t("admin.noBookings")}</p>
        )}
      </div>
    </>
  );
}
