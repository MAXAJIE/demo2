import { useTranslation } from "react-i18next";

function SkeletonHeader() {
  return (
    <div className="border-b border-line bg-surface/70">
      <div className="container-content flex h-20 items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-36" />
            <div className="skeleton h-2.5 w-24" />
          </div>
        </div>
        <div className="hidden items-center gap-5 md:flex">
          <div className="skeleton h-3 w-10" />
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-10" />
        </div>
        <div className="skeleton h-10 w-28 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Full public-site skeleton used while the tenant bundle or a lazy route is
 * loading. Shapes mirror the header, editorial hero and first content band so
 * the page does not jump when the real content arrives.
 */
export function SiteSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen bg-page"
      role="status"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <SkeletonHeader />
      <main>
        <section className="border-b border-line">
          <div className="container-content grid gap-10 py-12 md:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="skeleton h-3 w-28" />
              <div className="skeleton mt-5 h-[3.6rem] w-full max-w-[34rem] sm:h-[4.8rem]" />
              <div className="skeleton mt-3 h-[3.6rem] w-4/5 max-w-[27rem] sm:h-[4.8rem]" />
              <div className="skeleton mt-5 h-3 w-20" />
              <div className="skeleton mt-6 h-5 w-full max-w-[31rem]" />
              <div className="skeleton mt-3 h-5 w-2/3 max-w-[22rem]" />
              <div className="mt-8 flex flex-wrap gap-3">
                <div className="skeleton h-11 w-36 rounded-full" />
                <div className="skeleton h-11 w-36 rounded-full" />
              </div>
            </div>
            <div className="skeleton h-[19rem] w-full rounded-[26px] sm:h-[23rem]" />
          </div>
        </section>

        <section>
          <div className="container-content py-14 md:py-20">
            <div className="skeleton h-3 w-24" />
            <div className="grid gap-4 pt-6 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-[20px] border border-line/70 bg-surface/60 p-5">
                  <div className="skeleton h-44 w-full rounded-[14px]" />
                  <div className="skeleton mt-5 h-3 w-20" />
                  <div className="skeleton mt-3 h-5 w-3/4" />
                  <div className="skeleton mt-2 h-4 w-full" />
                  <div className="skeleton mt-2 h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * In-page confirmation skeleton. The header and footer are already mounted on
 * this route, so only the loading card is replaced.
 */
export function ConfirmationSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="container-content py-12 md:py-16"
      role="status"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <div className="mx-auto max-w-2xl">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-5 h-12 w-4/5" />
        <div className="skeleton mt-3 h-5 w-full" />
        <div className="skeleton mt-2 h-5 w-3/4" />
        <div className="mt-8 rounded-[22px] border border-line bg-surface p-5 md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="skeleton h-11 w-11 rounded-full" />
              <div>
                <div className="skeleton h-3 w-20" />
                <div className="skeleton mt-2 h-5 w-32" />
              </div>
            </div>
            <div className="skeleton h-7 w-24 rounded-full" />
          </div>
          <div className="mt-6 space-y-4 border-t border-line/70 pt-5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center justify-between gap-6">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-40" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-line/70 pt-5">
            <div className="skeleton h-11 w-40 rounded-full" />
            <div className="skeleton h-11 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
