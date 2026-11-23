"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";

export const FlipWords = ({
  words,
  duration = 3000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const [currentWord, setCurrentWord] = useState(words[0] ?? "");
  const reduceMotion = useReducedMotion();
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const signature = words.join("");

  useEffect(() => {
    setCurrentWord(wordsRef.current[0] ?? "");
  }, [signature]);

  useEffect(() => {
    if (reduceMotion || words.length < 2) return;
    const timer = window.setInterval(() => {
      setCurrentWord((current) => {
        const list = wordsRef.current;
        const index = list.indexOf(current);
        return list[(index + 1) % list.length] ?? list[0];
      });
    }, duration);
    return () => window.clearInterval(timer);
  }, [duration, reduceMotion, words.length]);

  if (reduceMotion) {
    return <span className={cn("inline-block px-2", className)}>{words[0]}</span>;
  }

  return (
    <AnimatePresence>
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 10 }}
        exit={{
          opacity: 0,
          y: -16,
          x: 8,
          filter: "blur(6px)",
          scale: 1.18,
          position: "absolute",
        }}
        className={cn(
          "relative z-10 inline-block px-2 text-left text-ink",
          className,
        )}
        key={currentWord}
      >
        {currentWord.split(" ").map((word, wordIndex) => (
          <motion.span
            key={word + wordIndex}
            initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: wordIndex * 0.24, duration: 0.34 }}
            className="inline-block whitespace-nowrap"
          >
            {word.split("").map((letter, letterIndex) => (
              <motion.span
                key={word + letterIndex}
                initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: wordIndex * 0.24 + letterIndex * 0.04,
                  duration: 0.26,
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
            <span className="inline-block">&nbsp;</span>
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
};
