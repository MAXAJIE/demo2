import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/utils";

type Link001Props = {
  children: ReactNode;
  href?: string;
  to?: string;
  className?: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

/**
 * The compact Aceternity-style redirect link: the rule draws in from the
 * left while the arrow rises into place. Internal routes use react-router;
 * external destinations stay anchors and open in a new tab.
 */
export function Link001({
  children,
  href,
  to,
  className,
  target,
  rel,
  "aria-label": ariaLabel,
}: Link001Props) {
  const classes = cn(
    "group relative inline-flex items-center",
    "before:pointer-events-none before:absolute before:left-0 before:bottom-[calc(50%-0.9em)] before:h-[0.05em] before:w-full before:bg-current before:content-['']",
    "before:origin-right before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)]",
    "hover:before:origin-left hover:before:scale-x-100 focus-visible:before:origin-left focus-visible:before:scale-x-100",
    className,
  );

  const arrow = (
    <svg
      className="ml-[0.3em] mt-[0em] size-[0.55em] translate-y-1 opacity-0 transition-all duration-300 [motion-reduce:transition-none] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
      fill="none"
      viewBox="0 0 10 10"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel}>
        {children}
        {arrow}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target={target ?? "_blank"}
      rel={rel ?? "noreferrer"}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
      {arrow}
    </a>
  );
}
