import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../app/tenant-context";
import { DoctorGrid } from "../components/site/DoctorGrid";
import { PageMeta } from "../components/site/PageMeta";
import { TextAnimationBlurFadeIn } from "../components/ui/text-animation-blur-fade-in";

export function DoctorsPage() {
  const { bundle, t, label } = useTenant();
  const { t: translate } = useTranslation();
  const doctors = bundle.content.doctors?.intro;
  const heading = t(doctors?.heading, translate("doctors.fallbackHeading"));
  const body = t(doctors?.body, translate("doctors.fallbackBody"));
  const bookCta = label("book_cta", translate("nav.book"));

  return (
    <>
      <PageMeta title={heading} description={body} />

      <section className="border-b border-line bg-page">
        <div className="container-content py-12 md:py-16">
          <p className="eyebrow">
            {t(doctors?.eyebrow, translate("doctors.eyebrow"))}
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-14">
            <TextAnimationBlurFadeIn
              as="h1"
              text={heading}
              className="display max-w-[18ch] text-[clamp(2.2rem,4.6vw,3.7rem)]"
            />
            <div className="lg:pb-2">
              <TextAnimationBlurFadeIn
                as="p"
                text={body}
                className="max-w-[40rem] text-[0.98rem] leading-relaxed text-muted"
                delay={0.1}
              />
              <p className="mt-4 max-w-[40rem] text-xs leading-relaxed text-muted">
                {translate("doctors.note")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-page">
        <div className="container-content py-10 md:py-14">
          <DoctorGrid content={doctors} />
        </div>
      </section>

      <section className="section-dark">
        <div className="container-content grid gap-8 py-14 md:grid-cols-[1.15fr_0.85fr] md:items-end md:py-20">
          <div>
            <TextAnimationBlurFadeIn
              as="h2"
              text={translate("doctors.ctaHeading")}
              className="display max-w-[18ch] text-[clamp(2rem,4vw,3.1rem)]"
            />
            <TextAnimationBlurFadeIn
              as="p"
              text={translate("doctors.ctaBody")}
              className="mt-4 max-w-lg text-[0.95rem] leading-relaxed mute-dark"
              delay={0.1}
            />
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link className="btn btn-accent" to="/book">
              {bookCta}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="btn btn-ghost-dark" to="/contact">
              {translate("nav.contact")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
