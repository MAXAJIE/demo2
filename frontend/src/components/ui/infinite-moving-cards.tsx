"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";

export type MovingCard = {
  quote: string;
  name: string;
  title: string;
  rating?: number;
};

function ReviewStars({ rating }: { rating: number }) {
  const { t } = useTranslation();
  return (
    <span
      className="mt-1 flex items-center gap-0.5 text-[#b9791a]"
      role="img"
      aria-label={t("home.ratingAria", { rating })}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          className={star <= rating ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5 fill-neutral-200"}
          aria-hidden="true"
        >
          <path d="m10 1.7 2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.7Z" />
        </svg>
      ))}
    </span>
  );
}

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: MovingCard[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);
  const signature = JSON.stringify(items);


  useEffect(() => {
    const container = containerRef.current;
    const scroller = scrollerRef.current;
    if (!container || !scroller || !items.length) return;

    const originals = Array.from(scroller.children);
    const clones = originals.map((item) => {
      const duplicate = item.cloneNode(true) as HTMLElement;
      duplicate.setAttribute("aria-hidden", "true");
      return duplicate;
    });
    clones.forEach((item) => scroller.appendChild(item));

    container.style.setProperty(
      "--animation-direction",
      direction === "left" ? "forwards" : "reverse",
    );
    container.style.setProperty(
      "--animation-duration",
      speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s",
    );
    setStart(true);

    return () => {
      clones.forEach((item) => item.remove());
      setStart(false);
    };
  }, [direction, items.length, signature, speed]);

  if (!items.length) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "review-marquee flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {items.map((item, idx) => (
          <li
            className="relative w-[350px] max-w-full shrink-0 rounded-2xl border border-b-0 border-zinc-200 bg-[linear-gradient(180deg,#fafafa,#f5f5f5)] px-8 py-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] md:w-[450px]"
            key={`${item.name}-${idx}`}
          >
            <blockquote>
              <div
                aria-hidden="true"
                className="user-select-none pointer-events-none absolute -top-0.5 -left-0.5 -z-1 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
              ></div>
              <span className="relative z-20 text-sm leading-[1.6] font-normal text-neutral-800">
                {item.quote}
              </span>
              <div className="relative z-20 mt-6 flex flex-row items-center">
                <span className="flex flex-col gap-1">
                  <span className="text-sm leading-[1.6] font-normal text-neutral-500">
                    {item.name}
                  </span>
                  <span className="text-sm leading-[1.6] font-normal text-neutral-500">
                    {item.title}
                  </span>
                  {item.rating ? <ReviewStars rating={item.rating} /> : null}
                </span>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
};
