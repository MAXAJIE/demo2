import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { cn } from "../../lib/utils";

export function ServiceStickyCta() {
  const { label } = useTenant();
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-5 z-30 hidden justify-center px-5 transition-all duration-500 ease-out md:flex",
        hidden ? "translate-y-[calc(100%+2rem)] opacity-0" : "translate-y-0 opacity-100",
      )}
      aria-hidden={hidden}
    >
      <div className="glass-panel pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-5 rounded-[18px] px-5 py-4 md:px-6">
        <div className="min-w-0">
          <p className="font-display text-[1.05rem] font-semibold tracking-tight">
            {t("services.readyTitle")}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">{t("services.readyBody")}</p>
        </div>
        <Link className="btn btn-accent shrink-0" to="/book" tabIndex={hidden ? -1 : undefined}>
          {label("book_cta", t("nav.book"))}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
