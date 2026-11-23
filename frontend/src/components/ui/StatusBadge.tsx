import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";

const bookingStyles: Record<string, string> = {
  pending: "badge-pending",
  confirmed: "badge-confirmed",
  declined: "badge-danger",
  cancelled: "badge-neutral",
};

const leadStyles: Record<string, string> = {
  new: "badge-confirmed",
  contacted: "badge-pending",
  closed: "badge-neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const label = t(`common.${status}`, { defaultValue: status });
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        bookingStyles[status] ?? leadStyles[status] ?? "badge-neutral",
      )}
    >
      {label}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const label =
    status === "new"
      ? t("admin.statusNew")
      : status === "contacted"
        ? t("admin.statusContacted")
        : t("admin.statusClosed");
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
        leadStyles[status] ?? "badge-neutral",
      )}
    >
      {label}
    </span>
  );
}
