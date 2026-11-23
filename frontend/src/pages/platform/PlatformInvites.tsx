import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Send } from "lucide-react";

import { useTenant } from "../../app/tenant-context";
import { ApiError, adminCreateInvite, adminListInvites } from "../../lib/api";
import { cn, formatDateTime, text as pick } from "../../lib/utils";
import type { AdminInvite, PlatformTenant } from "../../types";
import { platformText, type PlatformCopyKey } from "./copy";

const roles = ["owner", "manager", "staff", "platform"] as const;
type InviteRole = (typeof roles)[number];

type CopyState = "idle" | "copied" | "failed";
type InviteState = "active" | "used" | "expired";

/** A token is only ever useful before it is claimed or expires. */
function inviteState(invite: AdminInvite): InviteState {
  if (invite.used_at) return "used";
  const expiresMs = Date.parse(invite.expires_at);
  return Number.isFinite(expiresMs) && expiresMs <= Date.now() ? "expired" : "active";
}

function inviteStateClass(state: InviteState): string {
  if (state === "active") return "badge-confirmed";
  if (state === "expired") return "badge-pending";
  return "badge-neutral";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PlatformInvites({ tenants }: { tenants: PlatformTenant[] }) {
  const { bundle, locale } = useTenant();
  const queryClient = useQueryClient();
  const t = (key: PlatformCopyKey) => platformText(key, locale);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("staff");
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<AdminInvite | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Keep the tenant selection valid when the overview refreshes.
  useEffect(() => {
    setTenantId((current) =>
      current && tenants.some((tenant) => tenant.id === current) ? current : tenants[0]?.id ?? "",
    );
  }, [tenants]);

  const list = useQuery({
    queryKey: ["platform-invites"],
    queryFn: adminListInvites,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      adminCreateInvite({
        email: email.trim(),
        role,
        tenantId: role === "platform" ? null : tenantId || null,
      }),
    onSuccess: (invite) => {
      setCreated(invite);
      setCopyState("idle");
      setFormError("");
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: ["platform-invites"] });
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError && error.status === 403 ? t("noAccessBody") : t("inviteError"),
      );
    },
  });

  const roleLabel = (value: string): string => {
    if (value === "owner") return t("roleOwner");
    if (value === "manager") return t("roleManager");
    if (value === "platform") return t("rolePlatform");
    return t("roleStaff");
  };

  const workspaceName = (id: string | null): string => {
    if (!id) return t("allWorkspaces");
    const tenant = tenants.find((item) => item.id === id);
    return tenant ? pick(tenant.brand_name ?? undefined, locale, tenant.slug) : t("unknownWorkspace");
  };

  const stateLabel = (state: InviteState): string => {
    if (state === "used") return t("statusUsed");
    if (state === "expired") return t("statusExpired");
    return t("statusActive");
  };

  const submit = () => {
    setFormError("");
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFormError(t("invalidEmail"));
      return;
    }
    if (role !== "platform" && !tenantId) {
      setFormError(t("tenantRequired"));
      return;
    }
    mutation.mutate();
  };

  const createdLink = created?.token
    ? `${window.location.origin}/manage/login?invite=${encodeURIComponent(created.token)}`
    : "";

  const copyLink = async (value: string) => {
    try {
      // Browsers only expose the async clipboard on a secure origin.
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const invites = list.data?.invites ?? [];
  const canSubmit = Boolean(email.trim()) && (role === "platform" || Boolean(tenantId));

  return (
    <>
      <section className="card p-5 md:p-6">
        <h2 className="font-display text-base font-semibold tracking-tight">
          {t("invitesTitle")}
        </h2>
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted">{t("invitesHint")}</p>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          noValidate
        >
          <div>
            <label className="label" htmlFor="invite_email">
              {t("inviteEmail")}
            </label>
            <input
              id="invite_email"
              type="email"
              className="field"
              value={email}
              placeholder="name@example.com"
              autoComplete="off"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="invite_role">
              {t("inviteRole")}
            </label>
            <select
              id="invite_role"
              className="field"
              value={role}
              onChange={(event) => setRole(event.target.value as InviteRole)}
            >
              {roles.map((value) => (
                <option key={value} value={value}>
                  {roleLabel(value)}
                </option>
              ))}
            </select>
          </div>
          {role !== "platform" ? (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="invite_workspace">
                {t("inviteWorkspace")}
              </label>
              <select
                id="invite_workspace"
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
          ) : null}
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              className="btn btn-primary !min-h-[2.5rem] !text-xs"
              disabled={mutation.isPending || !canSubmit}
            >
              {mutation.isPending ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={14} aria-hidden="true" />
              )}
              {mutation.isPending ? t("creating") : t("createInvite")}
            </button>
            {formError ? (
              <p role="alert" className="error-text">
                {formError}
              </p>
            ) : null}
          </div>
        </form>

        {created ? (
          <div className="mt-5 rounded-control border border-line bg-page p-4">
            <p className="text-xs font-semibold">{t("inviteCreated")}</p>
            <p className="mt-1 break-all text-xs text-muted">
              {created.email} · {roleLabel(created.role)} · {workspaceName(created.tenant_id)}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 select-all break-all rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs">
                {createdLink}
              </code>
              <button
                type="button"
                className="btn btn-outline shrink-0 !min-h-[2.4rem] !px-3 !text-xs"
                onClick={() => void copyLink(createdLink)}
              >
                {copyState === "copied" ? (
                  <Check size={13} aria-hidden="true" />
                ) : (
                  <Copy size={13} aria-hidden="true" />
                )}
                {copyState === "copied" ? t("copied") : t("copyLink")}
              </button>
            </div>
            <p
              role="status"
              className={cn("mt-2 text-xs", copyState === "failed" ? "error-text" : "text-muted")}
            >
              {copyState === "failed" ? t("copyFailed") : t("linkOnce")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t("expires")} · {formatDateTime(created.expires_at, locale, bundle.site.timezone)}
            </p>
          </div>
        ) : null}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {t("inviteListTitle")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("inviteListHint")}</p>
        </div>

        {list.isLoading ? (
          <div className="space-y-3 p-5">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : list.isError ? (
          <div className="flex flex-wrap items-center gap-3 px-5 py-8 text-xs text-muted">
            <span>{t("listError")}</span>
            <button
              type="button"
              className="font-semibold underline decoration-line underline-offset-4 hover:no-underline"
              onClick={() => void list.refetch()}
            >
              {t("retry")}
            </button>
          </div>
        ) : invites.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">{t("noInvites")}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="table-clinic w-full min-w-[780px]">
                <thead>
                  <tr>
                    <th>{t("inviteEmail")}</th>
                    <th>{t("inviteRole")}</th>
                    <th>{t("inviteWorkspace")}</th>
                    <th>{t("createdLabel")}</th>
                    <th>{t("expires")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => {
                    const state = inviteState(invite);
                    return (
                      <tr key={invite.id} className="align-top">
                        <td className="break-all text-sm font-semibold">{invite.email}</td>
                        <td className="whitespace-nowrap text-sm">{roleLabel(invite.role)}</td>
                        <td className="text-sm">{workspaceName(invite.tenant_id)}</td>
                        <td className="whitespace-nowrap text-xs text-muted">
                          {invite.created_at
                            ? formatDateTime(invite.created_at, locale, bundle.site.timezone)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap text-xs text-muted">
                          {formatDateTime(invite.expires_at, locale, bundle.site.timezone)}
                        </td>
                        <td>
                          <span
                            className={cn(
                              "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
                              inviteStateClass(state),
                            )}
                          >
                            {stateLabel(state)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {invites.map((invite) => {
                const state = inviteState(invite);
                return (
                  <li key={invite.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-all text-sm font-semibold">{invite.email}</p>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
                          inviteStateClass(state),
                        )}
                      >
                        {stateLabel(state)}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <dt className="text-muted">{t("inviteRole")}</dt>
                        <dd>{roleLabel(invite.role)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("inviteWorkspace")}</dt>
                        <dd className="truncate">{workspaceName(invite.tenant_id)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("createdLabel")}</dt>
                        <dd>
                          {invite.created_at
                            ? formatDateTime(invite.created_at, locale, bundle.site.timezone)
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("expires")}</dt>
                        <dd>{formatDateTime(invite.expires_at, locale, bundle.site.timezone)}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
