import type { ReactNode } from "react";

import { Link001 } from "./link-001";

type TextLinkProps = {
  children: ReactNode;
  className?: string;
  to?: string;
  href?: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

/**
 * Text link whose rule retracts to the right, then draws in from the left
 * while the redirect arrow rises into place.
 */
export function TextLink({
  children,
  className,
  to,
  href,
  target,
  rel,
  "aria-label": ariaLabel,
}: TextLinkProps) {
  return (
    <Link001
      to={to}
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </Link001>
  );
}
