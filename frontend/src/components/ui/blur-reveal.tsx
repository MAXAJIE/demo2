"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";

/**
 * Scroll-in type reveal: the copy starts slightly low and out of focus, then
 * sharpens into place once. It runs only for the main page's editorial text.
 */
export function BlurReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={
        reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(20px)", scale: 0.99 }
      }
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 1.9, delay, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
