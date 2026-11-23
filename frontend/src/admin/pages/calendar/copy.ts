import type { Locale } from "../../../types";

/**
 * Calendar copy.
 *
 * The calendar is a closed set of front-desk labels, so it keeps its own
 * three-locale map next to the page instead of growing the public-site
 * translation bundle (same convention as the platform console). Every key
 * exists in all three locales; `satisfies` enforces that at compile time.
 * No string ends with punctuation, per the owner copy rule.
 */
export const calendarCopy = {
  title: {
    en: "Calendar",
    ms: "Kalendar",
    zh: "日历",
  },
  subtitle: {
    en: "The day at a glance and a booking for the caller on the line",
    ms: "Gambaran hari dan tempahan untuk pemanggil di talian",
    zh: "查看当日安排，并为来电顾客预约",
  },
  previousDay: {
    en: "Previous day",
    ms: "Hari sebelumnya",
    zh: "前一天",
  },
  nextDay: {
    en: "Next day",
    ms: "Hari seterusnya",
    zh: "后一天",
  },
  today: {
    en: "Today",
    ms: "Hari ini",
    zh: "今天",
  },
  dateLabel: {
    en: "Date",
    ms: "Tarikh",
    zh: "日期",
  },
  timezoneNote: {
    en: "Times are in {timezone}",
    ms: "Masa dalam {timezone}",
    zh: "时间为 {timezone}",
  },
  bookedTotal: {
    en: "Booked",
    ms: "Ditempah",
    zh: "已预约",
  },
  freeTotal: {
    en: "Free",
    ms: "Kosong",
    zh: "空闲",
  },
  timelineTitle: {
    en: "Day timeline",
    ms: "Garis masa hari",
    zh: "当日时间线",
  },
  freeRowLabel: {
    en: "Open slot",
    ms: "Slot kosong",
    zh: "空闲时段",
  },
  emptyDay: {
    en: "No appointments or open slots on this date",
    ms: "Tiada temujanji atau slot kosong pada tarikh ini",
    zh: "这一天没有预约，也没有空闲时段",
  },
  loadError: {
    en: "Could not load this day",
    ms: "Jadual hari tidak dapat dimuatkan",
    zh: "当日安排无法载入",
  },
  retry: {
    en: "Try again",
    ms: "Cuba lagi",
    zh: "重试",
  },
  loading: {
    en: "Loading",
    ms: "Memuatkan",
    zh: "载入中",
  },
  formTitle: {
    en: "Book for a caller",
    ms: "Tempah untuk pemanggil",
    zh: "为来电顾客预约",
  },
  formHint: {
    en: "Take the caller's details and hold a free slot",
    ms: "Ambil butiran pemanggil dan pegang slot kosong",
    zh: "填写顾客资料并保留空闲时段",
  },
  serviceLabel: {
    en: "Service",
    ms: "Perkhidmatan",
    zh: "服务",
  },
  servicePlaceholder: {
    en: "Choose a service",
    ms: "Pilih perkhidmatan",
    zh: "选择服务",
  },
  servicesLoading: {
    en: "Loading services",
    ms: "Memuatkan perkhidmatan",
    zh: "正在载入服务",
  },
  servicesError: {
    en: "Could not load services",
    ms: "Perkhidmatan tidak dapat dimuatkan",
    zh: "服务无法载入",
  },
  formDateHint: {
    en: "This date is shared with the day above",
    ms: "Tarikh ini dikongsi dengan jadual hari di atas",
    zh: "此日期与上方当日安排同步",
  },
  slotsLabel: {
    en: "Free slots",
    ms: "Slot kosong",
    zh: "空闲时段",
  },
  slotsHint: {
    en: "Tap a time to hold it for this caller",
    ms: "Ketik masa untuk pegang slot untuk pemanggil ini",
    zh: "点选时间即为这位顾客保留时段",
  },
  slotsLoading: {
    en: "Loading times",
    ms: "Memuatkan masa",
    zh: "正在载入时间",
  },
  slotsError: {
    en: "Could not load times",
    ms: "Masa tidak dapat dimuatkan",
    zh: "时间无法载入",
  },
  noService: {
    en: "Choose a service to see times",
    ms: "Pilih perkhidmatan untuk melihat masa",
    zh: "请选择服务以查看时间",
  },
  noSlots: {
    en: "No free slots for this service on this date",
    ms: "Tiada slot kosong untuk perkhidmatan ini pada tarikh ini",
    zh: "此日期该服务没有空闲时段",
  },
  slotsWindowHint: {
    en: "Times are shown for the next 30 days",
    ms: "Masa dipaparkan untuk 30 hari akan datang",
    zh: "仅显示未来 30 天的空闲时段",
  },
  bookedSlot: {
    en: "Booked",
    ms: "Ditempah",
    zh: "已预约",
  },
  nameLabel: {
    en: "Customer name",
    ms: "Nama pelanggan",
    zh: "顾客姓名",
  },
  namePlaceholder: {
    en: "Name as the caller gives it",
    ms: "Nama seperti yang diberikan pemanggil",
    zh: "来电时提供的姓名",
  },
  phoneLabel: {
    en: "Phone number",
    ms: "Nombor telefon",
    zh: "电话号码",
  },
  phonePlaceholder: {
    en: "+60 12-345 6789",
    ms: "+60 12-345 6789",
    zh: "+60 12-345 6789",
  },
  languageLabel: {
    en: "Language",
    ms: "Bahasa",
    zh: "语言",
  },
  languageEn: {
    en: "English",
    ms: "English",
    zh: "英语",
  },
  languageMs: {
    en: "Bahasa Melayu",
    ms: "Bahasa Melayu",
    zh: "马来语",
  },
  languageZh: {
    en: "中文",
    ms: "中文",
    zh: "中文",
  },
  submit: {
    en: "Book this slot",
    ms: "Tempah slot ini",
    zh: "预约此时段",
  },
  submitting: {
    en: "Booking",
    ms: "Menempah",
    zh: "预约中",
  },
  invalidName: {
    en: "Enter a name with at least two characters",
    ms: "Masukkan nama sekurang-kurangnya dua huruf",
    zh: "请输入至少两个字的姓名",
  },
  invalidPhone: {
    en: "Enter a valid mobile number",
    ms: "Masukkan nombor mudah alih yang sah",
    zh: "请输入有效的手机号码",
  },
  slotRequired: {
    en: "Choose a free slot first",
    ms: "Pilih slot kosong dahulu",
    zh: "请先选择空闲时段",
  },
  slotTaken: {
    en: "That slot was just taken",
    ms: "Slot itu baru sahaja diambil",
    zh: "该时段刚被预约",
  },
  errorGeneric: {
    en: "The booking could not be saved",
    ms: "Tempahan tidak dapat disimpan",
    zh: "预约无法保存",
  },
  successTitle: {
    en: "Appointment booked",
    ms: "Temujanji ditempah",
    zh: "预约已建立",
  },
  successRef: {
    en: "Reference",
    ms: "Rujukan",
    zh: "编号",
  },
  whatsappLink: {
    en: "Send WhatsApp confirmation",
    ms: "Hantar pengesahan WhatsApp",
    zh: "发送 WhatsApp 确认",
  },
  whatsappHint: {
    en: "Opens WhatsApp with the reference already written",
    ms: "Membuka WhatsApp dengan rujukan sudah ditulis",
    zh: "打开 WhatsApp 并自动填入预约编号",
  },
} satisfies Record<string, Record<Locale, string>>;

export type CalendarCopyKey = keyof typeof calendarCopy;

export function calendarText(key: CalendarCopyKey, locale: Locale): string {
  return calendarCopy[key][locale];
}
