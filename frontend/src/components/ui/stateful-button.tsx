"use client";

import React from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  /** Opens this URL in a new tab from the original click gesture. */
  redirectTo?: string;
}

/**
 * Aceternity-style stateful button: loader, then success check, then reset.
 * The redirect prop is called before the animation so pop-up blockers still
 * treat it as a direct user action.
 */
export const Button = ({ className, children, redirectTo, ...props }: ButtonProps) => {
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();

  const animateLoading = async () => {
    await animate(
      ".loader",
      {
        width: "20px",
        scale: 1,
        display: "block",
      },
      {
        duration: reduceMotion ? 0 : 0.2,
      },
    );
  };

  const animateSuccess = async () => {
    await animate(
      ".loader",
      {
        width: "0px",
        scale: 0,
        display: "none",
      },
      {
        duration: reduceMotion ? 0 : 0.2,
      },
    );
    await animate(
      ".check",
      {
        width: "20px",
        scale: 1,
        display: "block",
      },
      {
        duration: reduceMotion ? 0 : 0.2,
      },
    );

    await animate(
      ".check",
      {
        width: "0px",
        scale: 0,
        display: "none",
      },
      {
        delay: reduceMotion ? 0 : 2,
        duration: reduceMotion ? 0 : 0.2,
      },
    );
  };

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Open from the click task, not 200 ms later, so the browser keeps the gesture.
    if (redirectTo) {
      window.open(redirectTo, "_blank", "noopener,noreferrer");
    }
    await animateLoading();
    await onClick?.(event);
    await animateSuccess();
  };

  const {
    onClick,
    onDrag: _onDrag,
    onDragStart: _onDragStart,
    onDragEnd: _onDragEnd,
    onAnimationStart: _onAnimationStart,
    onAnimationEnd: _onAnimationEnd,
    type = "button",
    ...buttonProps
  } = props;
  void _onDrag;
  void _onDragStart;
  void _onDragEnd;
  void _onAnimationStart;
  void _onAnimationEnd;

  return (
    <motion.button
      layout
      ref={scope}
      type={type}
      transition={reduceMotion ? { duration: 0 } : undefined}
      className={cn(
        "flex min-h-11 min-w-[7.5rem] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#25D366] px-4 py-2 font-medium text-[#052E1B] transition duration-200 hover:outline hover:outline-2 hover:outline-offset-[3px] hover:outline-[#0B3B25]",
        className,
      )}
      {...buttonProps}
      onClick={handleClick}
    >
      <motion.div layout className="flex flex-nowrap items-center gap-2">
        <Loader reduceMotion={Boolean(reduceMotion)} />
        <CheckIcon />
        <motion.span layout className="inline-flex items-center gap-2 whitespace-nowrap">
          {children}
        </motion.span>
      </motion.div>
    </motion.button>
  );
};

const Loader = ({ reduceMotion }: { reduceMotion: boolean }) => {
  return (
    <motion.svg
      animate={
        reduceMotion
          ? undefined
          : {
              rotate: [0, 360],
            }
      }
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      style={{
        scale: 0.5,
        display: "none",
      }}
      transition={{
        duration: 0.3,
        repeat: Infinity,
        ease: "linear",
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="loader text-current"
      aria-hidden="true"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 3a9 9 0 1 0 9 9" />
    </motion.svg>
  );
};

const CheckIcon = () => {
  return (
    <motion.svg
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      style={{
        scale: 0.5,
        display: "none",
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="check text-current"
      aria-hidden="true"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M9 12l2 2l4 -4" />
    </motion.svg>
  );
};
