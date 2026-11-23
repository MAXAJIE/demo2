"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";

export const DirectionAwareHover = ({
  imageUrl,
  children,
  childrenClassName,
  imageClassName,
  className,
  linkTo,
  ariaLabel,
  revealOnHover = false,
}: {
  imageUrl: string;
  children: ReactNode | string;
  childrenClassName?: string;
  imageClassName?: string;
  className?: string;
  linkTo?: string;
  ariaLabel?: string;
  /** Keeps copy hidden until pointer hover or keyboard focus (desktop only). */
  revealOnHover?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [compact, setCompact] = useState(false);
  const [canHover, setCanHover] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const compactQuery = window.matchMedia("(max-width: 767px)");
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => {
      setCompact(compactQuery.matches);
      setCanHover(hoverQuery.matches);
    };
    update();
    compactQuery.addEventListener("change", update);
    hoverQuery.addEventListener("change", update);
    return () => {
      compactQuery.removeEventListener("change", update);
      hoverQuery.removeEventListener("change", update);
    };
  }, []);

  const active = focused || compact;
  const [direction, setDirection] = useState<
    "top" | "bottom" | "left" | "right" | string
  >("left");

  const handleMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
    if (!ref.current || reduceMotion) return;

    const nextDirection = getDirection(event, ref.current);
    switch (nextDirection) {
      case 0:
        setDirection("top");
        break;
      case 1:
        setDirection("right");
        break;
      case 2:
        setDirection("bottom");
        break;
      case 3:
        setDirection("left");
        break;
      default:
        setDirection("left");
        break;
    }
  };

  const getDirection = (event: MouseEvent<HTMLDivElement>, obj: HTMLElement) => {
    const { width: w, height: h, left, top } = obj.getBoundingClientRect();
    const x = event.clientX - left - (w / 2) * (w > h ? h / w : 1);
    const y = event.clientY - top - (h / 2) * (h > w ? w / h : 1);
    return Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
  };

  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      ref={ref}
      className={cn(
        "group/card relative isolate h-60 w-full overflow-hidden rounded-[22px] bg-transparent focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent md:h-96",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          className="relative h-full w-full"
          initial={active ? "top" : "initial"}
          animate={active ? "top" : reduceMotion ? "top" : "initial"}
          whileHover={reduceMotion ? undefined : direction}
          exit="exit"
        >
          <motion.div
            className={cn(
              "pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#081725]/90 via-[#081725]/25 to-transparent transition-opacity duration-500",
              revealOnHover &&
                canHover &&
                "md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100",
            )}
          />
          <motion.div
            className={cn(
              "absolute inset-0 z-10 hidden h-full w-full bg-black/35 transition duration-500 group-hover/card:block group-focus-within/card:block",
              revealOnHover && "bg-black/5",
            )}
          />
          <motion.div
            variants={variants}
            className="relative h-full w-full bg-surface2"
            transition={{
              duration: reduceMotion ? 0 : 0.2,
              ease: "easeOut",
            }}
          >
            <img
              alt=""
              aria-hidden="true"
              className={cn("h-full w-full scale-[1.15] object-cover", imageClassName)}
              width="1000"
              height="1000"
              src={imageUrl}
            />
          </motion.div>
          <motion.div
            className={cn(
              "absolute bottom-4 left-4 z-40 text-white transition duration-500 ease-out group-hover/card:-translate-y-5 group-focus-within/card:-translate-y-5 motion-reduce:transform-none",
              revealOnHover &&
                canHover &&
                "md:pointer-events-none md:translate-y-3 md:opacity-0 md:group-hover/card:pointer-events-auto md:group-hover/card:translate-y-0 md:group-hover/card:opacity-100 md:group-focus-within/card:pointer-events-auto md:group-focus-within/card:translate-y-0 md:group-focus-within/card:opacity-100",
              childrenClassName,
            )}
          >
            {children}
          </motion.div>
          {linkTo ? (
            <Link
              to={linkTo}
              className="absolute inset-0 z-50 rounded-[inherit]"
              aria-label={ariaLabel ?? (typeof children === "string" ? children : undefined)}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

const variants = {
  initial: { x: 0 },
  exit: { x: 0, y: 0 },
  top: { y: 20 },
  bottom: { y: -20 },
  left: { x: 20 },
  right: { x: -20 },
};

