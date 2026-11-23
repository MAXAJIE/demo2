import type { Locale } from "../../../types";

export type CopyEntry = Record<Locale, string>;

/**
 * Backstage copy for the services editor.
 *
 * Like the platform console, this surface is a small closed set of labels used
 * only here, so it keeps its own three-locale map next to the page instead of
 * growing the public-site translation bundle. Every key must exist in all three
 * locales; `satisfies` enforces that at compile time.
 *
 * Owner rule: UI copy never ends with a full stop or other trailing
 * punctuation, so none of the values below do.
 */
export const servicesCopy = {
  title: {
    en: "Services",
    ms: "Perkhidmatan",
    zh: "服务",
  },
  subtitle: {
    en: "Four short steps to edit one {service}",
    ms: "Empat langkah pendek untuk menyunting satu {service}",
    zh: "分四步编辑一项{service}",
  },
  serviceWord: {
    en: "service",
    ms: "perkhidmatan",
    zh: "服务",
  },
  empty: {
    en: "Nothing here yet",
    ms: "Belum ada apa-apa di sini",
    zh: "这里还没有内容",
  },
  editVerb: {
    en: "Edit",
    ms: "Sunting",
    zh: "编辑",
  },
  editService: {
    en: "Edit {service}",
    ms: "Sunting {service}",
    zh: "编辑{service}",
  },
  saveButton: {
    en: "Save {service}",
    ms: "Simpan {service}",
    zh: "保存{service}",
  },
  saveError: {
    en: "Could not save {service}, try again",
    ms: "{service} tidak dapat disimpan, cuba lagi",
    zh: "无法保存{service}，请重试",
  },
  savedBanner: {
    en: "{service} saved",
    ms: "{service} disimpan",
    zh: "{service}已保存",
  },
  stepDetails: {
    en: "Details",
    ms: "Butiran",
    zh: "基本信息",
  },
  stepPricing: {
    en: "Pricing",
    ms: "Harga",
    zh: "价格",
  },
  stepImages: {
    en: "Images",
    ms: "Imej",
    zh: "图片",
  },
  stepReview: {
    en: "Review",
    ms: "Semakan",
    zh: "确认",
  },
  stepsNav: {
    en: "Edit steps",
    ms: "Langkah suntingan",
    zh: "编辑步骤",
  },
  stepCounter: {
    en: "Step {n} of {total}",
    ms: "Langkah {n} daripada {total}",
    zh: "第 {n} 步，共 {total} 步",
  },
  detailsHint: {
    en: "Titles are required in all three languages",
    ms: "Tajuk wajib diisi dalam ketiga-tiga bahasa",
    zh: "三种语言的标题都必须填写",
  },
  titleField: {
    en: "Title",
    ms: "Tajuk",
    zh: "标题",
  },
  summaryField: {
    en: "Summary",
    ms: "Ringkasan",
    zh: "简介",
  },
  noteField: {
    en: "Short note",
    ms: "Nota ringkas",
    zh: "简短说明",
  },
  summaryHint: {
    en: "One line for the card on the list page",
    ms: "Satu baris untuk kad di halaman senarai",
    zh: "用于列表卡片的简短介绍",
  },
  noteHint: {
    en: "Shown beside the price, for example what is included",
    ms: "Dipaparkan di sebelah harga, contohnya apa yang termasuk",
    zh: "显示在价格旁，例如包含的内容",
  },
  required: {
    en: "Required",
    ms: "Wajib",
    zh: "必填",
  },
  optional: {
    en: "Optional",
    ms: "Pilihan",
    zh: "选填",
  },
  titleMissing: {
    en: "Add a title in every language",
    ms: "Isi tajuk dalam setiap bahasa",
    zh: "请填写每种语言的标题",
  },
  priceField: {
    en: "Price",
    ms: "Harga",
    zh: "价格",
  },
  depositField: {
    en: "Deposit",
    ms: "Deposit",
    zh: "订金",
  },
  priceHint: {
    en: "Write 80 or 80.50, saved in cents",
    ms: "Tulis 80 atau 80.50, disimpan dalam sen",
    zh: "填写 80 或 80.50，以分为单位保存",
  },
  priceInvalid: {
    en: "Use digits only, like 80 or 80.50",
    ms: "Guna angka sahaja, seperti 80 atau 80.50",
    zh: "只能填写数字，例如 80 或 80.50",
  },
  currencyLabel: {
    en: "Currency",
    ms: "Mata wang",
    zh: "货币",
  },
  currencyHint: {
    en: "Every price is stored in Malaysian ringgit",
    ms: "Semua harga dalam ringgit Malaysia",
    zh: "所有价格均以马来西亚令吉计价",
  },
  statusField: {
    en: "Status",
    ms: "Status",
    zh: "状态",
  },
  statusDraft: {
    en: "Draft",
    ms: "Draf",
    zh: "草稿",
  },
  statusPublished: {
    en: "Published",
    ms: "Diterbitkan",
    zh: "已发布",
  },
  statusHint: {
    en: "A draft stays hidden on the public site",
    ms: "Draf kekal tersembunyi di laman awam",
    zh: "草稿不会显示在公开网站",
  },
  imagesHint: {
    en: "Pick a photo, then zoom and drag to frame the crop",
    ms: "Pilih foto, kemudian zum dan seret untuk membingkai potongan",
    zh: "选择照片，然后缩放并拖动来调整裁剪",
  },
  imagesOptional: {
    en: "Both images are optional",
    ms: "Kedua-dua imej adalah pilihan",
    zh: "两张图片均为选填",
  },
  coverLabel: {
    en: "Cover image",
    ms: "Imej muka depan",
    zh: "封面图",
  },
  coverHint: {
    en: "Shown on the card at 4:5",
    ms: "Dipaparkan pada kad dengan nisbah 4:5",
    zh: "以 4:5 显示在卡片上",
  },
  detailLabel: {
    en: "Detail image",
    ms: "Imej butiran",
    zh: "详情图",
  },
  detailHint: {
    en: "Shown on the detail page at 16:9",
    ms: "Dipaparkan pada halaman butiran dengan nisbah 16:9",
    zh: "以 16:9 显示在详情页",
  },
  chooseImage: {
    en: "Choose image",
    ms: "Pilih imej",
    zh: "选择图片",
  },
  replaceImage: {
    en: "Replace image",
    ms: "Ganti imej",
    zh: "更换图片",
  },
  useCrop: {
    en: "Use this crop",
    ms: "Guna potongan ini",
    zh: "使用此裁剪",
  },
  zoomLabel: {
    en: "Zoom",
    ms: "Zum",
    zh: "缩放",
  },
  zoomIn: {
    en: "Zoom in",
    ms: "Zum masuk",
    zh: "放大",
  },
  zoomOut: {
    en: "Zoom out",
    ms: "Zum keluar",
    zh: "缩小",
  },
  resetFraming: {
    en: "Reset framing",
    ms: "Set semula bingkai",
    zh: "重置画面",
  },
  dragHint: {
    en: "Drag the photo to move the crop",
    ms: "Seret foto untuk mengalih potongan",
    zh: "拖动照片以移动裁剪区域",
  },
  uploading: {
    en: "Uploading",
    ms: "Memuat naik",
    zh: "上传中",
  },
  uploadFailed: {
    en: "The upload did not finish, try again",
    ms: "Muat naik tidak selesai, cuba lagi",
    zh: "上传未完成，请重试",
  },
  storageUnconfigured: {
    en: "Image storage is not set up for this demo, so the crop stays on screen and the rest of the wizard still works",
    ms: "Storan imej belum disediakan untuk demo ini, jadi potongan kekal di skrin dan langkah lain masih boleh digunakan",
    zh: "此演示环境尚未配置图片存储，裁剪图像会保留在屏幕上，其余步骤仍可正常使用",
  },
  noImageYet: {
    en: "No image yet",
    ms: "Belum ada imej",
    zh: "暂无图片",
  },
  cardPreview: {
    en: "Card preview",
    ms: "Pratonton kad",
    zh: "卡片预览",
  },
  detailPreview: {
    en: "Detail preview",
    ms: "Pratonton butiran",
    zh: "详情预览",
  },
  reviewHint: {
    en: "Check every language and both images before saving",
    ms: "Semak setiap bahasa dan kedua-dua imej sebelum menyimpan",
    zh: "保存前请检查每种语言和两张图片",
  },
  reviewLanguages: {
    en: "Languages",
    ms: "Bahasa",
    zh: "语言",
  },
  notSet: {
    en: "Not set",
    ms: "Belum diisi",
    zh: "未填写",
  },
  untitled: {
    en: "Untitled",
    ms: "Tanpa tajuk",
    zh: "未命名",
  },
  back: {
    en: "Back",
    ms: "Kembali",
    zh: "返回",
  },
  next: {
    en: "Next",
    ms: "Seterusnya",
    zh: "下一步",
  },
  preview: {
    en: "Preview",
    ms: "Pratonton",
    zh: "预览",
  },
  submitting: {
    en: "Saving",
    ms: "Menyimpan",
    zh: "保存中",
  },
  close: {
    en: "Close",
    ms: "Tutup",
    zh: "关闭",
  },
  previewTitle: {
    en: "Preview how it looks",
    ms: "Pratonton rupa",
    zh: "预览效果",
  },
  previewHint: {
    en: "Nothing is saved until you submit",
    ms: "Tiada apa disimpan sehingga anda menyerahkan",
    zh: "提交前不会保存任何内容",
  },
  previewOnly: {
    en: "Preview only",
    ms: "Pratonton sahaja",
    zh: "仅供预览",
  },
  loadError: {
    en: "Could not load this view",
    ms: "Paparan ini tidak dapat dimuatkan",
    zh: "无法加载此视图",
  },
  fileNotImage: {
    en: "That file is not an image",
    ms: "Fail itu bukan imej",
    zh: "该文件不是图片",
  },
  fileTooLarge: {
    en: "This image is too large, pick one under 15 MB",
    ms: "Imej ini terlalu besar, pilih fail bawah 15 MB",
    zh: "图片过大，请选择 15 MB 以下的文件",
  },
  durationField: {
    en: "Duration",
    ms: "Tempoh",
    zh: "时长",
  },
  minutes: {
    en: "{n} min",
    ms: "{n} min",
    zh: "{n} 分钟",
  },
} satisfies Record<string, CopyEntry>;

export type ServicesCopyKey = keyof typeof servicesCopy;

/** Language tabs for the three editing languages; names stay untranslated. */
export const LANGUAGES = [
  { key: "en", label: "English", short: "EN" },
  { key: "ms", label: "Bahasa Melayu", short: "BM" },
  { key: "zh", label: "中文", short: "中文" },
] as const satisfies ReadonlyArray<{ key: Locale; label: string; short: string }>;

/** Fills `{name}` placeholders without pulling in a formatting dependency. */
export function formatCopy(template: string, values: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}
