import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { SiteLayout } from "./app/SiteLayout";
import { SiteSkeleton } from "./components/site/Skeletons";
import { HomePage } from "./pages/HomePage";

const ServicesPage = lazy(() =>
  import("./pages/ServicesPage").then((module) => ({ default: module.ServicesPage })),
);
const ServiceDetailPage = lazy(() =>
  import("./pages/ServiceDetailPage").then((module) => ({ default: module.ServiceDetailPage })),
);
const BookingPage = lazy(() =>
  import("./pages/BookingPage").then((module) => ({ default: module.BookingPage })),
);
const BookingConfirmationPage = lazy(() =>
  import("./pages/BookingConfirmationPage").then((module) => ({
    default: module.BookingConfirmationPage,
  })),
);
const AboutPage = lazy(() =>
  import("./pages/AboutPage").then((module) => ({ default: module.AboutPage })),
);
const DoctorsPage = lazy(() =>
  import("./pages/DoctorsPage").then((module) => ({ default: module.DoctorsPage })),
);
const FaqPage = lazy(() =>
  import("./pages/FaqPage").then((module) => ({ default: module.FaqPage })),
);
const ContactPage = lazy(() =>
  import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })),
);
const LegalPage = lazy(() =>
  import("./pages/LegalPage").then((module) => ({ default: module.LegalPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

function RouteFallback() {
  return <SiteSkeleton />;
}

/**
 * Tenant-facing site only. The backstage is a separate app (src/admin, served
 * on its own host); the footer links to it.
 */
export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:slug" element={<ServiceDetailPage />} />
          <Route path="book" element={<BookingPage />} />
          <Route path="booking/:ref" element={<BookingConfirmationPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<LegalPage kind="privacy" />} />
          <Route path="terms" element={<LegalPage kind="terms" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
