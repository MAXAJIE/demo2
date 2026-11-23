import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import type { DoctorsContent } from "../../types";
import { doctorPhoto } from "../../lib/doctors";
import { AnimatedTestimonials, type Testimonial } from "../ui/animated-testimonials";
import { TextAnimationBlurFadeIn } from "../ui/text-animation-blur-fade-in";

export function DoctorShowcase({ content }: { content: DoctorsContent }) {
  const { t } = useTenant();
  const { t: translate } = useTranslation();
  const items = content.items ?? [];

  const testimonials: Testimonial[] = items.map((doctor, index) => ({
    quote: t(doctor.bio, translate("doctors.profilePending")),
    name: t(doctor.name),
    designation: t(doctor.role, translate("doctors.cardRoleFallback")),
    src: doctorPhoto(doctor.photo, index),
  }));

  if (!testimonials.length) return null;

  return (
    <section className="border-b border-line/70 bg-page">
      <div className="container-content pt-16 md:pt-24">
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-16">
          <div>
            <p className="eyebrow">{t(content.eyebrow, translate("doctors.eyebrow"))}</p>
            <TextAnimationBlurFadeIn
              as="h2"
              text={t(content.heading, translate("doctors.fallbackHeading"))}
              className="display mt-3 max-w-[16ch] text-[clamp(2rem,4vw,3.1rem)]"
            />
          </div>
          <div className="lg:pb-1">
            <TextAnimationBlurFadeIn
              as="p"
              text={t(content.body, translate("doctors.fallbackBody"))}
              className="max-w-[38rem] text-[0.95rem] leading-relaxed text-muted"
              delay={0.1}
            />
          </div>
        </div>

        <div>
          <AnimatedTestimonials
            testimonials={testimonials}
            autoplay
            prevLabel={translate("doctors.previous")}
            nextLabel={translate("doctors.next")}
            imageFooter={
              <Link
                to="/doctors"
                className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink transition hover:text-accent-ink"
              >
                {translate("doctors.viewAll")}
                <ArrowRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
