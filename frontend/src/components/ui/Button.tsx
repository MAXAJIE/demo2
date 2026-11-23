import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type Variant = "primary" | "accent" | "outline" | "inverse" | "ghostDark" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  outline: "btn-outline",
  inverse: "btn-inverse",
  accent: "btn-accent",
  ghostDark: "btn-ghost-dark",
  danger: "btn-danger",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "btn",
        variants[variant],
        size === "sm" && "!min-h-[2.4rem] !px-3.5 !text-[0.8rem]",
        className,
      )}
      {...props}
    />
  );
});
