import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

import { cn } from "../../lib/utils";

type InputFieldProps = ComponentPropsWithoutRef<"input"> & {
  wrapperClassName?: string;
};

type SmoothInputProps = InputFieldProps;

const springConfig = { stiffness: 500, damping: 30, mass: 0.5 };

const passwordChar =
  typeof navigator !== "undefined" && /firefox|fxios/i.test(navigator.userAgent)
    ? "\u25CF"
    : "\u2022";

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  function SmoothInput(
    {
      className,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      placeholder,
      style,
      type = "text",
      ...props
    },
    forwardedRef,
  ) {
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const caretX = useMotionValue(0);
    const caretOpacity = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const springCaretX = useSpring(
      caretX,
      prefersReducedMotion ? { stiffness: 10000, damping: 100, mass: 0.1 } : springConfig,
    );

    const isControlled = value !== undefined;
    const inputValue = isControlled ? String(value) : internalValue;

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement, []);

    const syncMeasureSpan = () => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return;

      const styles = window.getComputedStyle(input);
      const isPassword = input.type === "password";

      let fontSize = styles.fontSize;
      if (passwordChar === "\u2022" && isPassword && !/chrome|chromium|crios/i.test(navigator.userAgent)) {
        fontSize = `${parseFloat(fontSize) + 6.25}px`;
      }

      measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize} ${styles.fontFamily}`;
      measureSpan.style.letterSpacing = styles.letterSpacing;
      measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
      measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
    };

    const measurePrefixWidth = (text: string) => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return null;

      syncMeasureSpan();
      measureSpan.textContent = text;

      const styles = window.getComputedStyle(input);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const borderLeft = parseFloat(styles.borderLeftWidth) || 0;

      return text.length > 0
        ? measureSpan.offsetWidth + paddingLeft + borderLeft
        : paddingLeft + borderLeft - 1;
    };

    const scrollCaretIntoView = (target: HTMLInputElement, absoluteWidth: number) => {
      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
      const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
      const visibleLeft = target.scrollLeft + paddingLeft;

      if (absoluteWidth > visibleRight) {
        target.scrollLeft = Math.min(absoluteWidth - target.clientWidth + paddingRight, maxScroll);
        return;
      }

      if (absoluteWidth < visibleLeft) {
        target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
      }
    };

    const getCaretIndex = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;

      if (selectionStart === selectionEnd) return selectionStart;

      return target.selectionDirection === "backward" ? selectionStart : selectionEnd;
    };

    const updateCaretFromInput = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;
      const caretIndex = getCaretIndex(target);
      const isPassword = target.type === "password";
      const textBeforeCaret = isPassword
        ? passwordChar.repeat(caretIndex)
        : target.value.slice(0, caretIndex);

      const absoluteWidth = measurePrefixWidth(textBeforeCaret);
      if (absoluteWidth === null) return;

      scrollCaretIntoView(target, absoluteWidth);

      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const caretPosition = absoluteWidth - target.scrollLeft;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      const isCaretVisible = caretPosition >= minX && caretPosition <= maxX + 1;

      caretX.set(Math.min(caretPosition, maxX));

      if (!isCaretVisible || hasSelection) {
        caretOpacity.set(0);
        return;
      }

      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromInput);
    updateCaretRef.current = updateCaretFromInput;

    useEffect(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        updateCaretRef.current(input);
      }
    }, [inputValue]);

    useEffect(() => {
      const input = inputRef.current;
      const container = containerRef.current;
      if (!input || !container) return;

      const updateCaretIfFocused = () => {
        if (document.activeElement === input) updateCaretRef.current(input);
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== input) return;

        requestAnimationFrame(() => {
          if (document.activeElement === input) updateCaretRef.current(input);
        });
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      document.fonts?.addEventListener("loadingdone", updateCaretIfFocused);
      void document.fonts?.ready.then(updateCaretIfFocused);
      input.addEventListener("scroll", updateCaretIfFocused);

      const resizeObserver = new ResizeObserver(updateCaretIfFocused);
      resizeObserver.observe(container);

      updateCaretIfFocused();

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        document.fonts?.removeEventListener("loadingdone", updateCaretIfFocused);
        input.removeEventListener("scroll", updateCaretIfFocused);
        resizeObserver.disconnect();
      };
    }, []);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(event.target.value);
      onChange?.(event);
      requestAnimationFrame(() => updateCaretRef.current(event.target));
    };

    const inputStyle: CSSProperties = { ...style, caretColor: "transparent" };

    return (
      <div ref={containerRef} className={cn("relative grid", wrapperClassName)}>
        <input
          {...props}
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          className={cn(
            "col-start-1 col-end-2 row-start-1 row-end-2 w-full min-w-0 text-inherit outline-none",
            className,
          )}
          style={inputStyle}
          value={inputValue}
          onChange={handleChange}
          onFocus={(event) => {
            onFocus?.(event);
            requestAnimationFrame(() => updateCaretRef.current(event.target));
          }}
          onBlur={(event) => {
            caretOpacity.set(0);
            onBlur?.(event);
          }}
        />
        <span
    
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre"
        />
        <motion.span
          aria-hidden="true"
          className="pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 h-[1.15em] w-[1.5px] self-center rounded-full bg-primary"
          style={{ x: springCaretX, opacity: caretOpacity }}
        />
      </div>
    );
  },
);
