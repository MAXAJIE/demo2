import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { PageMeta } from "../components/site/PageMeta";

export function NotFoundPage() {
  const { bundle, t, label } = useTenant();
  const { t: translate } = useTranslation();

  return (
    <>
      <PageMeta title={translate("common.notFoundTitle")} noindex />
      <section className="container-content flex min-h-[68vh] flex-col justify-center py-20">
        <h1 className="display mt-4 max-w-[16ch] text-[clamp(2.6rem,6vw,4.6rem)]">
          {translate("common.notFoundTitle")}
        </h1>
        <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-muted">
          {translate("common.notFoundBody")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-primary" to="/book">
            {label("book_cta", translate("nav.book"))}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="btn btn-outline" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            {translate("common.home")}
          </Link>
        </div>
        <p className="mt-10 text-xs text-muted">{t(bundle.content.home?.hero?.spec_line)}</p>
      </section>
    </>
  );
}
