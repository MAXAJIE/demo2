"use client";

import { useEffect, useMemo } from "react";
import { motion, stagger, useAnimate, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  textClassName,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  textClassName?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();
  const wordsArray = useMemo(
    () => (/[\u3400-\u9fff]/.test(words) ? Array.from(words) : words.split(" ")),
    [words],
  );

  useEffect(() => {
    if (!scope.current) return;
    if (reduceMotion) {
      animate(
        "span",
        { opacity: 1, filter: "none" },
        { duration: 0 },
      );
      return;
    }
    animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration || 1,
        delay: stagger(0.09),
      },
    );
  }, [animate, duration, filter, reduceMotion, scope, words]);

  const renderWords = () => {
    return (
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className={cn("text-ink", reduceMotion ? "opacity-100" : "opacity-0")}
              style={{
                filter: filter && !reduceMotion ? "blur(10px)" : "none",
              }}
            >
              {word}
              {idx < wordsArray.length - 1 && !/[\u3400-\u9fff]/.test(words) ? " " : ""}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn("font-bold", className)}>
      <div className="mt-4">
        <div
          className={cn(
            "text-2xl leading-snug tracking-wide text-ink",
            textClassName,
          )}
        >
          {renderWords()}
        </div>
      </div>
    </div>
  );
};
