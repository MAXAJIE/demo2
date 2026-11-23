"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";

type ModalContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ModalContext = createContext<ModalContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <ModalContext.Provider value={{ open, setOpen }}>{children}</ModalContext.Provider>;
}

export function Modal({
  children,
  labelId,
}: {
  children: ReactNode;
  labelId?: string;
}) {
  const { open, setOpen } = useModal();
  const modalRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useOutsideClick(modalRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const focusTimer = window.setTimeout(() => modalRef.current?.focus(), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
        >
          <div className="absolute inset-0 bg-[#101712]/65" aria-hidden="true" />
          <motion.div
            ref={modalRef}
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            tabIndex={-1}
            className="relative z-10 max-h-[calc(100vh-3rem)] w-full max-w-[calc(100%-0rem)] overflow-y-auto rounded-[24px] border border-line bg-surface p-0 shadow-lift sm:max-w-[42rem]"
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}

export function ModalContent({
  children,
  className,
  closeLabel = "Close",
}: {
  children: ReactNode;
  className?: string;
  closeLabel?: string;
}) {
  const { setOpen } = useModal();
  return (
    <div className={cn("relative p-5 sm:p-7", className)}>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label={closeLabel}
        className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-ink"
      >
        <X size={18} aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-3 p-5 pt-0 sm:p-7 sm:pt-0", className)}>{children}</div>;
}

export function ModalTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { setOpen } = useModal();
  return (
    <div className={cn("inline-flex", className)} onClick={() => setOpen(true)}>
      {children}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  exceptionRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!ref.current || ref.current.contains(target)) return;
      if (exceptionRef?.current?.contains(target)) return;
      callback();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [callback, exceptionRef, ref]);
}
