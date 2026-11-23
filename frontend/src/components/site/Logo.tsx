import { cn } from "../../lib/utils";

export function ToothMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("h-9 w-9", className)}
      fill="none"
    >
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="11.25" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
      <path
        d="M20 7.8c-4.6 0-7.2 2.7-7.2 6.9 0 3.2 1.6 4.8 2.5 8.2.9 3.3.7 8.6 2.8 8.6 2 0 1.5-6.4 3.9-6.4s1.8 6.4 3.8 6.4c2 0 1.9-5.3 2.8-8.6.9-3.4 2.5-5 2.5-8.2 0-4.2-2.6-6.9-7.2-6.9-1.5 0-2.6.8-3.8.8s-2.3-.8-3.8-.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="30.5" cy="9.5" r="1.5" fill="currentColor" fillOpacity="0.75" />
    </svg>
  );
}

export function BrandBlock({
  name,
  location,
  className,
  wrapName = false,
}: {
  name: string;
  location: string;
  className?: string;
  wrapName?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <ToothMark />
      <span className="min-w-0">
        <span
          className={cn(
            "block font-display text-[0.95rem] font-semibold tracking-tight",
            wrapName ? "leading-[1.15]" : "truncate leading-tight",
          )}
        >
          {name}
        </span>
        <span className="logo-location mt-1 hidden max-w-[13rem] truncate text-xs font-medium tracking-[0.12em] sm:block">
          {location}
        </span>
      </span>
    </span>
  );
}
