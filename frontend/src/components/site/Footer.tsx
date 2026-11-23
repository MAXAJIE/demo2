import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { normalizePhone, safeHttpUrl, text } from "../../lib/utils";
import { BrandBlock } from "./Logo";
import { GoogleMapsIcon } from "./GoogleMapsIcon";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function Footer() {
  const { bundle, locale, label } = useTenant();
  const { t: translate } = useTranslation();
  const contact = bundle.site.contact;
  const year = new Date().getFullYear();
  const brand = text(bundle.site.brand_name, locale);
  const address = text(contact.address, locale);
  const hours = text(contact.opening_hours, locale);
  const locationLabel = text(bundle.content.home?.hero?.eyebrow, locale, "")
    .split("·")[0]
    .trim();
  const waHref = `https://wa.me/${normalizePhone(contact.whatsapp)}`;

  const navItems = [
    { to: "/", label: translate("nav.home") },
    { to: "/services", label: label("offerings_plural", translate("nav.services")) },
    { to: "/doctors", label: translate("nav.doctors") },
    { to: "/about", label: translate("nav.about") },
    { to: "/faq", label: translate("nav.faq") },
    { to: "/contact", label: translate("nav.contact") },
    { to: "/book", label: label("book_cta", translate("nav.book")) },
  ];

  return (
    <footer className="section-dark border-t line-dark">
      <div className="container-content py-14 md:py-16">
        <div className="flex flex-col items-center text-center">
          <Link
            to="/"
            className="rounded-full p-1"
            aria-label={brand}
          >
            <BrandBlock name={brand} location={locationLabel} wrapName />
          </Link>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">
            {translate("footer.tagline")}
          </p>

          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/70">
            {address} · {hours}
          </p>

          <nav
            aria-label={translate("footer.explore")}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-white/75"
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex min-h-11 items-center transition hover:text-on-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-9 border-t border-dashed line-dark" />

        <div className="mt-5 flex flex-col gap-5 text-xs text-white/70 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {brand}. {translate("footer.rights")}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={safeHttpUrl(contact.map_url)}
              target="_blank"
              rel="noreferrer"
              aria-label={translate("common.openInMaps")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/75 transition hover:border-white/50 hover:text-on-brand"
            >
              <GoogleMapsIcon className="h-4 w-4" />
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              aria-label={translate("common.whatsapp")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#25D366] bg-[#25D366] text-[#052E1B] transition hover:outline hover:outline-2 hover:outline-offset-[3px] hover:outline-[#7BE495]"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              aria-label={translate("common.phone")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/75 transition hover:border-white/50 hover:text-on-brand"
            >
              <Phone size={16} aria-hidden="true" />
            </a>

            <span className="mx-1 hidden h-4 w-px bg-white/20 md:block" />

            <Link
              className="inline-flex min-h-11 items-center px-1 transition hover:text-on-brand"
              to="/privacy"
            >
              {translate("footer.privacy")}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center px-1 transition hover:text-on-brand"
              to="/terms"
            >
              {translate("footer.terms")}
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-relaxed text-white/70">
          {translate("footer.medicalNote")}
        </p>
      </div>
    </footer>
  );
}
