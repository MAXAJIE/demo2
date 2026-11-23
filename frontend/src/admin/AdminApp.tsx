import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { SiteSkeleton } from "../components/site/Skeletons";

const AdminLayout = lazy(() =>
  import("./pages/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
const AdminLoginPage = lazy(() =>
  import("./pages/AdminLoginPage").then((module) => ({ default: module.AdminLoginPage })),
);
const AdminOverviewPage = lazy(() =>
  import("./pages/AdminOverviewPage").then((module) => ({ default: module.AdminOverviewPage })),
);
const AdminBookingsPage = lazy(() =>
  import("./pages/AdminBookingsPage").then((module) => ({ default: module.AdminBookingsPage })),
);
const CalendarPage = lazy(() =>
  import("./pages/calendar/CalendarPage").then((module) => ({ default: module.CalendarPage })),
);
const AdminLeadsPage = lazy(() =>
  import("./pages/AdminLeadsPage").then((module) => ({ default: module.AdminLeadsPage })),
);
const AdminServicesPage = lazy(() =>
  import("./pages/AdminServicesPage").then((module) => ({ default: module.AdminServicesPage })),
);
const AdminSettingsPage = lazy(() =>
  import("./pages/AdminSettingsPage").then((module) => ({ default: module.AdminSettingsPage })),
);
const PlatformPage = lazy(() =>
  import("./pages/platform/PlatformPage").then((module) => ({ default: module.PlatformPage })),
);

/**
 * Standalone backstage: one app for every workspace, served on its own host.
 * The dev-only console lives at /platform and is guarded by the platform RPC,
 * never by a nav link.
 */
export function AdminApp() {
  return (
    <Suspense fallback={<SiteSkeleton />}>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="leads" element={<AdminLeadsPage />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="platform" element={<PlatformPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
