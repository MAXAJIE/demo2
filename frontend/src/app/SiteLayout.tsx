import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Header } from "../components/site/Header";
import { Footer } from "../components/site/Footer";
import { DentistJsonLd } from "../components/site/PageMeta";
import { MobileActions } from "../components/site/MobileActions";
import { ScrollProgress } from "../components/site/ScrollProgress";

export function SiteLayout() {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="site-canvas min-h-screen">
      <div className="relative z-10">
        <a href="#main" className="sr-only-focusable btn btn-primary fixed left-4 top-4 z-50">
          {t("common.skipToContent")}
        </a>
        <DentistJsonLd />
        <ScrollProgress />
        <Header />
        <main id="main">
          <Outlet />
        </main>
        <Footer />
        <MobileActions />
      </div>
    </div>
  );
}
