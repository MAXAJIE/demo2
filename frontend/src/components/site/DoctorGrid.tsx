import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import type { DoctorsContent } from "../../types";
import { doctorPhoto } from "../../lib/doctors";

export function DoctorGrid({ content }: { content?: DoctorsContent }) {
  const { t, label } = useTenant();
  const { t: translate } = useTranslation();
  const items = content?.items ?? [];

  if (!items.length) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {translate("doctors.emptyTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          {translate("doctors.emptyBody")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="btn btn-primary" to="/book">
            {label("book_cta", translate("nav.book"))}
          </Link>
          <Link className="btn btn-outline" to="/contact">
            {translate("nav.contact")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((doctor, index) => {
        const name = t(doctor.name);
        const role = t(doctor.role, translate("doctors.cardRoleFallback"));
        return (
          <article
            key={doctor.id}
            className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-[0_18px_44px_-38px_rgba(18,32,51,0.55)] transition duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_30px_66px_-40px_rgba(18,32,51,0.55)]"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-surface2">
              <img
                src={doctorPhoto(doctor.photo, index)}
                alt={name}
                width={600}
                height={750}
                loading={index > 1 ? "lazy" : "eager"}
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <span className="absolute left-4 top-4 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 px-2 text-[11px] font-semibold tabular-nums text-ink backdrop-blur">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5 md:p-6">
              <h2 className="font-display text-[1.35rem] font-semibold leading-tight tracking-tight">
                {name}
              </h2>
              <p className="mt-1 text-sm text-muted">{role}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {t(doctor.bio, translate("doctors.profilePending"))}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
