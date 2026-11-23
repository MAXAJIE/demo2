import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";

import { useTenant } from "../../app/tenant-context";
import { cn } from "../../lib/utils";
import type { FaqItem } from "../../types";

type AnswerToken = { text: string; animate: boolean };

function tokenizeAnswer(answer: string): { tokens: AnswerToken[]; stagger: number } {
  const isCjk = /[\u3400-\u9fff]/.test(answer);
  const tokens = isCjk
    ? Array.from(answer).map((text) => ({ text, animate: text.trim().length > 0 }))
    : answer
        .split(/(\s+)/)
        .filter(Boolean)
        .map((text) => ({ text, animate: text.trim().length > 0 }));

  const animatedCount = tokens.filter((token) => token.animate).length;
  const stagger = Math.min(isCjk ? 0.09 : 0.12, 2.6 / Math.max(1, animatedCount));

  return { tokens, stagger };
}

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTenant();
  const { t: translate } = useTranslation();
  const reduceMotion = useReducedMotion();
  const answer = t(item.answer);
  const { tokens, stagger } = tokenizeAnswer(answer);
  const baseId = useId().replace(/:/g, "");
  const buttonId = `faq-trigger-${baseId}`;
  const panelId = `faq-panel-${baseId}`;
  let wordIndex = 0;

  return (
    <div
      className={cn(
        "group/faq relative overflow-hidden rounded-[18px] border bg-white/85 transition-colors duration-300",
        open
          ? "border-accent/35 shadow-soft"
          : "border-line/80 hover:border-accent/30 hover:bg-white",
      )}
    >
      <h3 className="relative">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer list-none items-center gap-4 px-5 py-5 text-left transition-colors duration-300 md:px-6 md:py-5"
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center transition-colors duration-300",
              open ? "text-accent-ink" : "text-muted group-hover/faq:text-accent-ink",
            )}
          >
            <ChevronDown
              size={17}
              aria-hidden="true"
              className={cn(
                "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                open && "rotate-180",
              )}
            />
          </span>
          <span className="min-w-0 flex-1 font-body text-[1.16rem] font-medium leading-[1.55] tracking-[0.012em] [word-spacing:0.08em] md:text-[1.22rem]">
            {t(item.question)}
          </span>
        </button>
      </h3>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                height: { duration: 0.65, ease: [0.65, 0, 0.35, 1] },
                opacity: { duration: 0.35, ease: [0.65, 0, 0.35, 1] },
              }
        }
        className="overflow-hidden"
      >
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="answer"
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="px-3 pb-3 md:px-4 md:pb-4"
            >
              <div className="rounded-[14px] border border-line/75 bg-[#F6F8FB] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_20px_-24px_rgba(16,42,67,0.35)] md:px-5 md:py-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {translate("faq.answer")}
                </p>
                <div className="relative max-w-[70ch] whitespace-pre-line text-[1.03rem] leading-[1.85] tracking-[0.002em] [word-spacing:0.04em] text-ink md:text-[1.08rem]">
                  <span className="sr-only">{answer}</span>
                  {reduceMotion ? (
                    <span aria-hidden="true">{answer}</span>
                  ) : (
                    <span aria-hidden="true">
                      {tokens.map((token, index) => {
                        if (!token.animate) {
                          return <span key={`${index}-space`}>{token.text}</span>;
                        }

                        const currentWord = wordIndex;
                        wordIndex += 1;

                        return (
                          <motion.span
                            key={`${index}-${token.text}`}
                            className="inline-block"
                            initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{
                              duration: 0.68,
                              delay: 0.25 + currentWord * stagger,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          >
                            {token.text}
                          </motion.span>
                        );
                      })}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    items.length ? new Set([String(items[0].id)]) : new Set(),
  );

  const toggle = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={reduceMotion ? false : { opacity: 0, y: 18, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: reduceMotion ? 0 : 0.8,
            delay: reduceMotion ? 0 : index * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <FaqRow
            item={item}
            open={openIds.has(String(item.id))}
            onToggle={() => toggle(String(item.id))}
          />
        </motion.div>
      ))}
    </div>
  );
}
