import { cn, money } from "../../../lib/utils";
import type { Locale } from "../../../types";
import { servicesCopy } from "./copy";
import type { ServiceStatus } from "./state";

export type FrameContent = {
  locale: Locale;
  title: string;
  summary: string;
  note: string;
  priceCents: number | null;
  depositCents: number | null;
  status: ServiceStatus;
};

function StatusBadge({ locale, status }: { locale: Locale; status: ServiceStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
        status === "published" ? "badge-confirmed" : "badge-neutral",
      )}
    >
      {status === "published"
        ? servicesCopy.statusPublished[locale]
        : servicesCopy.statusDraft[locale]}
    </span>
  );
}

function fallbackTitle(content: FrameContent): string {
  return content.title.trim() || servicesCopy.untitled[content.locale];
}

/** A small mock of the public 4:5 service card, driven by the live draft. */
export function ServiceCardFrame({
  coverUrl,
  className,
  ...content
}: FrameContent & { coverUrl?: string; className?: string }) {
  const title = fallbackTitle(content);
  const depositWord = servicesCopy.depositField[content.locale].toLowerCase();

  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface shadow-soft",
        className,
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface2">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">
            {servicesCopy.noImageYet[content.locale]}
          </div>
        )}
        <span className="absolute left-3 top-3">
          <StatusBadge locale={content.locale} status={content.status} />
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold leading-snug tracking-tight">
          {title}
        </h3>
        {content.summary.trim() ? (
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">
            {content.summary}
          </p>
        ) : null}
        {content.note.trim() ? (
          <p className="mt-2 text-xs font-medium text-ink">{content.note}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs">
          <span className="font-medium">
            {content.priceCents !== null
              ? money(content.priceCents)
              : servicesCopy.notSet[content.locale]}
          </span>
          {content.depositCents !== null ? (
            <span className="text-muted">
              {money(content.depositCents)} {depositWord}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** A small mock of the 16:9 detail-page header, driven by the live draft. */
export function ServiceDetailFrame({
  detailUrl,
  className,
  ...content
}: FrameContent & { detailUrl?: string; className?: string }) {
  const title = fallbackTitle(content);
  const depositWord = servicesCopy.depositField[content.locale].toLowerCase();

  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface shadow-soft",
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface2">
        {detailUrl ? (
          <img src={detailUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">
            {servicesCopy.noImageYet[content.locale]}
          </div>
        )}
      </div>
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
            {title}
          </h3>
          <StatusBadge locale={content.locale} status={content.status} />
        </div>
        {content.summary.trim() ? (
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted">{content.summary}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3 text-xs">
          <div>
            {content.note.trim() ? <p className="font-medium text-ink">{content.note}</p> : null}
            <p className="mt-0.5 text-muted">
              {content.priceCents !== null
                ? money(content.priceCents)
                : servicesCopy.notSet[content.locale]}
            </p>
          </div>
          {content.depositCents !== null ? (
            <span className="text-muted">
              {money(content.depositCents)} {depositWord}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
