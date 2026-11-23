import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, Clock3, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { cn, text } from "../../lib/utils";
import type { Locale } from "../../types";
import { BrandBlock } from "./Logo";

const links = [
  { to: "/", key: "nav.home" },
  { to: "/services", key: "nav.services" },
  { to: "/doctors", key: "nav.doctors" },
  { to: "/about", key: "nav.about" },
  { to: "/faq", key: "nav.faq" },
  { to: "/contact", key: "nav.contact" },
] as const;

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  zh: "中文",
};

const LANGUAGE_SHORT: Record<Locale, string> = {
  en: "EN",
  ms: "BM",
  zh: "中文",
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { bundle, locale, setLocale } = useTenant();
  const { t: translate } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId().replace(/:/g, "");
  const locales = useMemo(() => bundle.site.locales ?? ["en"], [bundle.site.locales]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selected = Math.max(0, locales.indexOf(locale));
    const frame = window.requestAnimationFrame(() => optionRefs.current[selected]?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [locale, locales, open]);

  if (locales.length < 2) return null;

  const choose = (code: Locale) => {
    setLocale(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    const direction =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (event.key === "Home") {
      event.preventDefault();
      optionRefs.current[0]?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      optionRefs.current[locales.length - 1]?.focus();
      return;
    }
    if (!direction) return;
    event.preventDefault();
    const next = (index + direction + locales.length) % locales.length;
    optionRefs.current[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${translate("common.language")}: ${LANGUAGE_LABELS[locale]}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line text-xs font-semibold text-ink transition-colors hover:border-muted",
          compact ? "min-w-11 px-2.5" : "px-3",
        )}
      >
        <span>{LANGUAGE_SHORT[locale]}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn("transition-transform duration-300", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="listbox"
            aria-label={translate("common.language")}
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute top-[calc(100%+0.5rem)] z-50 w-52 overflow-hidden rounded-[16px] border border-line bg-surface p-1 shadow-lift",
              compact ? "right-0" : "left-0 lg:left-auto lg:right-0",
            )}
          >
            {locales.map((code, index) => {
              const selected = locale === code;
              return (
                <button
                  key={code}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(code)}
                  onKeyDown={(event) => moveFocus(event, index)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-[11px] px-3 text-left text-sm transition-colors",
                    selected
                      ? "bg-accent/10 font-semibold text-accent-ink"
                      : "text-ink hover:bg-surface2",
                  )}
                >
                  <span>{LANGUAGE_LABELS[code]}</span>
                  {selected ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true" className="text-xs font-medium text-muted">
                      {LANGUAGE_SHORT[code]}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Header() {
  const { bundle, locale, label } = useTenant();
  const { t: translate } = useTranslation();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!servicesOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setServicesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [servicesOpen]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);

    const frame = window.requestAnimationFrame(() => focusables()[0]?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open && wasOpen.current) menuButtonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled((current) => {
        const next = window.scrollY > 12;
        return current === next ? current : next;
      });
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const brand = text(bundle.site.brand_name, locale);
  const locationLabel = text(bundle.content.home?.hero?.eyebrow, locale, "")
    .split("·")[0]
    .trim();
  const bookCta = label("book_cta", translate("nav.book"));

  return (
    <header
      className={cn(
        "header-shell sticky top-0 z-40 border-b text-ink",
        scrolled && "is-scrolled",
      )}
    >
      <div className="container-content grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:flex lg:justify-between">
        <Link
          to="/"
          className="min-w-0 rounded-control py-1"
          aria-label={brand}
        >
          <BrandBlock name={brand} location={locationLabel} wrapName />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={translate("nav.primary")}>
          {links.map((link) => {
            if (link.to === "/services") {
              return (
                <div
                  key={link.to}
                  ref={servicesRef}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                  onFocusCapture={() => setServicesOpen(true)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setServicesOpen(false);
                    }
                  }}
                >
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        "relative inline-flex h-11 items-center gap-1 px-3.5 text-sm font-medium leading-5 transition-colors duration-300",
                        isActive ? "text-ink" : "text-muted hover:text-ink",
                      )
                    }
                    aria-haspopup="true"
                    aria-expanded={servicesOpen}
                    aria-controls="services-mega"
                  >
                    {({ isActive }) => (
                      <>
                        {translate(link.key)}
                        <ChevronDown
                          size={13}
                          aria-hidden="true"
                          className={cn(
                            "transition-transform duration-300",
                            servicesOpen && "rotate-180",
                          )}
                        />
                        {isActive ? (
                          <motion.span
                            layoutId="desktop-nav-indicator"
                            className="absolute inset-x-3.5 bottom-0 h-[2px] rounded-full bg-accent"
                            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
                          />
                        ) : null}
                      </>
                    )}
                  </NavLink>

                  <AnimatePresence>
                    {servicesOpen ? (
                      <motion.div
                        id="services-mega"
                        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 300, damping: 28, mass: 0.7 }
                        }
                        className="absolute left-1/2 top-full z-50 w-[38rem] -translate-x-1/2 pt-3"
                      >
                        <div className="overflow-hidden rounded-[22px] border border-line bg-surface p-2 shadow-lift">
                          <div className="grid gap-2 sm:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-1">
                              <p className="px-3 pb-1 pt-2 text-xs font-semibold tracking-[0.14em] text-muted">
                                {label("offerings_plural", translate("nav.services"))}
                              </p>
                              {bundle.offerings.map((offering, index) => (
                                <Link
                                  key={offering.id}
                                  to={`/services/${offering.slug}`}
                                  className="group flex items-start gap-3 rounded-[14px] px-3 py-3 transition-colors duration-300 hover:bg-surface2 focus-visible:bg-surface2"
                                >
                                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold tabular-nums text-accent-ink">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                      <span className="text-sm font-semibold leading-snug">
                                        {text(offering.title, locale)}
                                      </span>
                                      <ArrowUpRight
                                        size={14}
                                        aria-hidden="true"
                                        className="shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                                      />
                                    </span>
                                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                                      {text(offering.price_note, locale)}
                                    </span>
                                  </span>
                                </Link>
                              ))}
                            </div>
                            <div className="rounded-[16px] bg-surface2 p-4">
                              <p className="text-xs font-semibold tracking-[0.14em] text-muted">
                                {translate("hero.hoursLabel")}
                              </p>
                              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-ink">
                                <Clock3 size={14} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
                                {text(bundle.site.contact.opening_hours, locale)}
                              </p>
                              <p className="mt-3 text-xs leading-relaxed text-muted">
                                {translate("services.depositNote")}
                              </p>
                              <Link
                                to="/services"
                                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-accent-ink underline decoration-accent/40 underline-offset-4 hover:no-underline"
                              >
                                {translate("home.viewAllServices")}
                                <ArrowUpRight size={13} aria-hidden="true" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            }
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex h-11 items-center px-3.5 text-sm font-medium leading-5 transition-colors duration-300",
                    isActive ? "text-ink" : "text-muted hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {translate(link.key)}
                    {isActive ? (
                      <motion.span
                        layoutId="desktop-nav-indicator"
                        className="absolute inset-x-3.5 bottom-0 h-[2px] rounded-full bg-accent"
                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <Link to="/book" className="btn btn-accent !min-h-11 !px-4 !text-sm">
            {bookCta}
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden"><LanguageSwitcher compact /><button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink lg:hidden"
          ref={menuButtonRef}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? translate("nav.closeMenu") : translate("nav.openMenu")}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button></div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            ref={menuRef}
            key="mobile-menu"
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="overflow-hidden border-t border-line bg-page lg:hidden"
          >
            <nav className="container-content space-y-1 py-5" aria-label={translate("nav.mobile")}>
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-control px-3 py-3 text-base font-medium",
                      isActive ? "bg-surface2 text-ink" : "text-muted hover:bg-surface2 hover:text-ink",
                    )
                  }
                >
                  {translate(link.key)}
                </NavLink>
              ))}
              <div className="mt-4 border-t border-line/80 pt-4">
                <p className="px-3 text-xs font-semibold tracking-[0.14em] text-muted">
                  {label("offerings_plural", translate("nav.services"))}
                </p>
                <div className="mt-2 space-y-1">
                  {bundle.offerings.map((offering) => (
                    <Link
                      key={offering.id}
                      to={`/services/${offering.slug}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
                    >
                      <span>{text(offering.title, locale)}</span>
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="pt-4">
                <Link to="/book" className="btn btn-accent !min-h-[2.75rem] w-full !text-sm">
                  {bookCta}
                </Link>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
