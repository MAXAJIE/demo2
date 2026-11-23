import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTenant } from "../../app/tenant-context";
import { adminListMembers } from "../../lib/api";
import { cn, text as pick } from "../../lib/utils";
import type { PlatformTenant } from "../../types";
import { platformText, type PlatformCopyKey } from "./copy";

export function PlatformMembers({ tenants }: { tenants: PlatformTenant[] }) {
  const { locale } = useTenant();
  const t = (key: PlatformCopyKey) => platformText(key, locale);
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");

  // Keep the selection valid when the overview refreshes.
  useEffect(() => {
    setTenantId((current) =>
      current && tenants.some((tenant) => tenant.id === current) ? current : tenants[0]?.id ?? "",
    );
  }, [tenants]);

  const query = useQuery({
    queryKey: ["platform-members", tenantId],
    queryFn: () => adminListMembers(tenantId),
    enabled: Boolean(tenantId),
    retry: false,
  });

  const members = query.data?.members ?? [];

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight">
          {t("membersTitle")}
        </h2>
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted">{t("membersHint")}</p>
        <div className="mt-3 max-w-xs">
          <label className="label" htmlFor="members_workspace">
            {t("selectWorkspace")}
          </label>
          <select
            id="members_workspace"
            className="field"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
          >
            {tenants.length === 0 ? <option value="">{t("noTenants")}</option> : null}
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {pick(tenant.brand_name ?? undefined, locale, tenant.slug)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3 p-5">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      ) : query.isError ? (
        <div className="flex flex-wrap items-center gap-3 px-5 py-8 text-xs text-muted">
          <span>{t("membersError")}</span>
          <button
            type="button"
            className="font-semibold underline decoration-line underline-offset-4 hover:no-underline"
            onClick={() => void query.refetch()}
          >
            {t("retry")}
          </button>
        </div>
      ) : members.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">{t("noMembers")}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="table-clinic w-full min-w-[560px]">
              <thead>
                <tr>
                  <th>{t("memberColumn")}</th>
                  <th>{t("inviteRole")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id}>
                    <td className="break-all font-mono text-xs">{member.user_id}</td>
                    <td className="whitespace-nowrap text-sm capitalize">{member.role}</td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
                          member.active ? "badge-confirmed" : "badge-neutral",
                        )}
                      >
                        {member.active ? t("memberActive") : t("memberInactive")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {members.map((member) => (
              <li key={member.user_id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-all font-mono text-xs">{member.user_id}</p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
                      member.active ? "badge-confirmed" : "badge-neutral",
                    )}
                  >
                    {member.active ? t("memberActive") : t("memberInactive")}
                  </span>
                </div>
                <p className="mt-1 text-xs capitalize text-muted">
                  {t("inviteRole")} · {member.role}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
