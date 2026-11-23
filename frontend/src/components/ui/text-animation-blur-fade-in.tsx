"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";

type TextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span";

/**
 * Scroll-triggered word-by-word blur fade, in the spirit of Aceternity's
 * text-animation-blur-fade-in demo. English copy animates per word; Chinese
 * copy (no spaces) animates per character so long strings still reveal.
 */
export function TextAnimationBlurFadeIn({
  text,
  as: Tag = "p",
  className,
  delay = 0,
  stagger = 0.055,
  once = true,
}: {
  text: string;
  as?: TextTag;
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const isCjk = /[\u3400-\u9fff]/.test(text);
  const tokens = isCjk ? Array.from(text) : text.split(/(\s+)/);

  if (reduceMotion || !text) {
    return <Tag className={cn(className)}>{text}</Tag>;
  }

  return (
    <Tag className={cn(className)}>
      <motion.span
        className="inline"
        initial="hidden"
        whileInView="visible"
        viewport={{ once, amount: 0.28 }}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: stagger, delayChildren: delay },
          },
        }}
      >
        {tokens.map((token, index) => {
          if (!token.trim()) {
            return (
              <Fragment key={`space-${index}`}>
                {token}
              </Fragment>
            );
          }
          return (
            <motion.span
              key={`${token}-${index}`}
              className="inline-block"
              style={{ willChange: "transform, filter, opacity" }}
              variants={{
                hidden: { opacity: 0, y: 12, filter: "blur(12px)" },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                },
              }}
            >
              {token}
            </motion.span>
          );
        })}
      </motion.span>
    </Tag>
  );
}
