import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import type { I18nText, ReviewItem } from "../../types";
import { InfiniteMovingCards, type MovingCard } from "../ui/infinite-moving-cards";

type SummaryCard = {
  id: string;
  label: I18nText;
  body: I18nText;
};

const SUMMARY: SummaryCard[] = [
  {
    id: "hours",
    label: { en: "Opening hours", zh: "营业时间", ms: "Waktu operasi" },
    body: {
      en: "Open every day until 11 PM, with the last appointment starting at 10:30 PM.",
      zh: "每天营业至晚上 11 点，最晚预约时间为晚上 10:30。",
      ms: "Dibuka setiap hari sehingga 11 malam, dengan temujanji terakhir bermula 10:30 malam.",
    },
  },
  {
    id: "evening",
    label: { en: "Evening slots", zh: "晚间时段", ms: "Slot petang" },
    body: {
      en: "After-work appointments are available late into the evening, including weekends.",
      zh: "下班后仍可预约晚间时段，周末同样营业。",
      ms: "Temujanji selepas kerja tersedia hingga lewat petang, termasuk hujung minggu.",
    },
  },
  {
    id: "area",
    label: { en: "Location", zh: "位置", ms: "Lokasi" },
    body: {
      en: "At 61, Jalan Perisai in Taman Sri Tebrau, about 2.6 km from the Woodlands CIQ.",
      zh: "位于大丰花园 61, Jalan Perisai，距新柔关卡约 2.6 公里。",
      ms: "Di 61, Jalan Perisai, Taman Sri Tebrau, kira-kira 2.6 km dari CIQ Woodlands.",
    },
  },
  {
    id: "fees",
    label: { en: "Fees", zh: "费用", ms: "Yuran" },
    body: {
      en: "Scaling and polishing start from RM 80. The final fee is confirmed after examination.",
      zh: "洗牙与抛光从 RM 80 起，最终费用在检查后确认。",
      ms: "Pembersihan skala dan penggilapan bermula dari RM 80. Yuran akhir disahkan selepas pemeriksaan.",
    },
  },
  {
    id: "deposit",
    label: { en: "Slot deposit", zh: "时段订金", ms: "Deposit slot" },
    body: {
      en: "A RM 30 deposit holds the slot and is deducted from the treatment bill.",
      zh: "RM 30 订金用于保留时段，并直接从诊疗费中抵扣。",
      ms: "Deposit RM 30 memegang slot dan ditolak daripada bil rawatan.",
    },
  },
  {
    id: "language",
    label: { en: "Front desk", zh: "前台沟通", ms: "Kaunter hadapan" },
    body: {
      en: "Ask about a slot, a fee or a current dental problem in English or Bahasa Melayu.",
      zh: "可用英文或中文询问时段、费用或当前牙齿问题。",
      ms: "Tanya tentang slot, yuran atau masalah gigi semasa dalam bahasa Inggeris atau Bahasa Melayu.",
    },
  },
  {
    id: "urgent",
    label: { en: "Urgent care", zh: "急诊处理", ms: "Rawatan segera" },
    body: {
      en: "After-hours toothache care gives urgent cases a priority evening slot.",
      zh: "夜间牙痛急诊会为紧急情况优先安排晚间时段。",
      ms: "Rawatan sakit gigi selepas waktu memberi kes segera slot petang keutamaan.",
    },
  },
  {
    id: "restorative",
    label: { en: "Restorative care", zh: "修复治疗", ms: "Rawatan pemulihan" },
    body: {
      en: "Root canal treatment, crowns and wisdom tooth surgery are quoted after examination.",
      zh: "根管治疗、牙冠与智齿手术会在检查后报价。",
      ms: "Rawatan saluran akar, mahkota dan pembedahan gigi bongsu disebut harga selepas pemeriksaan.",
    },
  },
  {
    id: "general",
    label: { en: "General dentistry", zh: "全科牙科", ms: "Pergigian am" },
    body: {
      en: "Fillings, extractions and general dental checks are handled at the same clinic.",
      zh: "补牙、拔牙与一般牙科检查都在同一间诊所处理。",
      ms: "Tampalan, cabutan dan pemeriksaan pergigian am diuruskan di klinik yang sama.",
    },
  },
  {
    id: "rating",
    label: { en: "Google rating", zh: "Google 评分", ms: "Penarafan Google" },
    body: {
      en: "4.8 out of 5 from more than 850 Google reviews. Review text stays on Google Maps.",
      zh: "Google 评分 4.8 分，累计 850+ 条评价。评论原文保留在 Google Maps。",
      ms: "4.8 daripada 5 daripada lebih 850 ulasan Google. Teks ulasan kekal di Google Maps.",
    },
  },
];

function Stars({ rating }: { rating: number }) {
  const percentage = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className="relative inline-flex" aria-hidden="true">
      <span className="flex gap-0.5 text-line">
        {[0, 1, 2, 3, 4].map((star) => (
          <svg key={star} viewBox="0 0 20 20" className="h-4 w-4 fill-current">
            <path d="m10 1.7 2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.7Z" />
          </svg>
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 flex overflow-hidden text-[#b9791a]"
        style={{ width: `${percentage}%` }}
      >
        <span className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((star) => (
            <svg key={star} viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-current">
              <path d="m10 1.7 2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.7Z" />
            </svg>
          ))}
        </span>
      </span>
    </span>
  );
}

export function ReviewsCarousel({
  items,
  rating = 4.8,
}: {
  items?: ReviewItem[];
  rating?: number;
}) {
  const { locale, t } = useTenant();
  const { t: translate } = useTranslation();

  const cards = useMemo<MovingCard[]>(() => {
    if (items?.length) {
      return items.map((card) => ({
        quote: t(card.text),
        name: t(card.author),
        title: translate("home.googleReview"),
        rating: card.rating ?? 5,
      }));
    }
    return SUMMARY.map((card) => ({
      quote: t(card.body),
      name: t(card.label),
      title: translate("home.googleListing"),
    }));
  }, [items, t, translate]);

  if (!cards.length) return null;

  return (
    <div
      className="relative"
      role="region"
      aria-label={translate("home.reviewCarousel")}
    >
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Stars rating={rating} />
        <span className="text-sm font-semibold tabular-nums text-ink">
          {rating.toFixed(1)} {translate("home.outOfFive")}
        </span>
        <span className="text-xs text-muted">{translate("home.ratingSource")}</span>
      </div>

      <InfiniteMovingCards
        key={locale}
        items={cards}
        direction="left"
        speed="fast"
        pauseOnHover={false}
        className="mt-4 -mx-5 md:mx-0"
      />
    </div>
  );
}
