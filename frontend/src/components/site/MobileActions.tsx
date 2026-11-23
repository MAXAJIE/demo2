import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { normalizePhone, text, whatsappHref } from "../../lib/utils";

export function MobileActions() {
  const { bundle, locale, label } = useTenant();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  if (pathname === "/book" || pathname.startsWith("/booking/")) return null;

  const contact = bundle.site.contact;
  const brand = text(bundle.site.brand_name, locale);
  const waText =
    locale === "zh"
      ? `你好，我想询问 ${brand} 的看诊时段。`
      : locale === "ms"
        ? `Hai ${brand}, saya ingin bertanya tentang slot pergigian.`
        : `Hi ${brand}, I'd like to ask about a dental slot.`;

  return (
    <nav className="mobile-actions" aria-label={t("nav.quickActions")}>
      <Link className="btn-accent rounded-control" to="/book">
        <CalendarDays size={17} aria-hidden="true" />
        {label("book_cta", t("nav.book"))}
      </Link>
      <a className="btn-whatsapp" href={whatsappHref(contact.whatsapp, waText)} target="_blank" rel="noreferrer">
        <WhatsAppIcon className="h-[17px] w-[17px]" />
        {t("common.whatsapp")}
      </a>
      <a href={`tel:${normalizePhone(contact.phone)}`}>
        <Phone size={17} aria-hidden="true" />
        {t("common.phone")}
      </a>
    </nav>
  );
}
