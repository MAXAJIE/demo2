import type { Locale } from "../../types";

/**
 * Platform console copy.
 *
 * The console is a small, closed set of labels used only here, so it keeps its
 * own three-locale map next to the page instead of growing the public-site
 * translation bundle. Every key must exist in all three locales; `satisfies`
 * enforces that at compile time.
 */
export const platformCopy = {
  title: {
    en: "Platform console",
    ms: "Konsol platform",
    zh: "平台控制台",
  },
  subtitle: {
    en: "Every workspace at a glance, with invitations and members.",
    ms: "Semua ruang kerja sekali pandang, bersama jemputan dan ahli.",
    zh: "一览所有租户，管理邀请与成员。",
  },
  backToWorkspace: {
    en: "Back to workspace",
    ms: "Kembali ke ruang kerja",
    zh: "返回后台",
  },
  signOut: {
    en: "Sign out",
    ms: "Daftar keluar",
    zh: "退出登录",
  },
  noAccessTitle: {
    en: "No platform access",
    ms: "Tiada akses platform",
    zh: "无平台访问权限",
  },
  noAccessBody: {
    en: "You are signed in, but this account is not on the platform admin list. Ask the platform owner to add you, or sign out.",
    ms: "Anda telah log masuk, tetapi akaun ini tiada dalam senarai pentadbir platform. Hubungi pemilik platform untuk menambah anda, atau daftar keluar.",
    zh: "你已登录，但此账号不在平台管理员名单中。请联系平台负责人添加，或退出登录。",
  },
  overviewError: {
    en: "Could not load the platform overview.",
    ms: "Gambaran platform tidak dapat dimuatkan.",
    zh: "无法载入平台概览。",
  },
  unsupported: {
    en: "The platform console needs the Supabase data source. This build is using another data adapter.",
    ms: "Konsol platform memerlukan sumber data Supabase. Binaan ini menggunakan penyesuai data lain.",
    zh: "平台控制台需要 Supabase 数据源，当前版本使用其他数据适配器。",
  },
  retry: {
    en: "Try again",
    ms: "Cuba lagi",
    zh: "重试",
  },
  tenantsTitle: {
    en: "Workspaces",
    ms: "Ruang kerja",
    zh: "租户",
  },
  tenantsHint: {
    en: "Every registered tenant with live counts.",
    ms: "Setiap penyewa berdaftar dengan kiraan langsung.",
    zh: "所有已注册租户与实时数据。",
  },
  brand: {
    en: "Brand",
    ms: "Jenama",
    zh: "品牌",
  },
  plan: {
    en: "Plan",
    ms: "Pelan",
    zh: "方案",
  },
  status: {
    en: "Status",
    ms: "Status",
    zh: "状态",
  },
  pendingBookings: {
    en: "Pending",
    ms: "Menunggu",
    zh: "待确认",
  },
  newLeads: {
    en: "New inquiries",
    ms: "Pertanyaan baharu",
    zh: "新询问",
  },
  publishedServices: {
    en: "Published",
    ms: "Diterbitkan",
    zh: "已发布",
  },
  noTenants: {
    en: "No workspaces yet.",
    ms: "Tiada ruang kerja lagi.",
    zh: "暂无租户。",
  },
  invitesTitle: {
    en: "Invitations",
    ms: "Jemputan",
    zh: "邀请",
  },
  invitesHint: {
    en: "Invite an owner, manager or staff member to a workspace. The platform role invites another platform admin.",
    ms: "Jemput pemilik, pengurus atau kakitangan ke sesuatu ruang kerja. Peranan platform menjemput pentadbir platform lain.",
    zh: "邀请负责人、经理或员工加入租户。选择平台角色可邀请其他平台管理员。",
  },
  inviteEmail: {
    en: "Email",
    ms: "E-mel",
    zh: "电邮",
  },
  inviteRole: {
    en: "Role",
    ms: "Peranan",
    zh: "角色",
  },
  inviteWorkspace: {
    en: "Workspace",
    ms: "Ruang kerja",
    zh: "租户",
  },
  createInvite: {
    en: "Create invite",
    ms: "Cipta jemputan",
    zh: "创建邀请",
  },
  creating: {
    en: "Creating",
    ms: "Mencipta",
    zh: "创建中",
  },
  inviteCreated: {
    en: "Invitation created",
    ms: "Jemputan dicipta",
    zh: "邀请已创建",
  },
  copyLink: {
    en: "Copy link",
    ms: "Salin pautan",
    zh: "复制链接",
  },
  copied: {
    en: "Copied",
    ms: "Disalin",
    zh: "已复制",
  },
  copyFailed: {
    en: "Could not copy. Select the link and copy it manually.",
    ms: "Tidak dapat menyalin. Pilih pautan itu dan salin secara manual.",
    zh: "无法复制，请手动选取链接复制。",
  },
  linkOnce: {
    en: "Copy this link now — it will not be shown again.",
    ms: "Salin pautan ini sekarang — ia tidak akan dipaparkan lagi.",
    zh: "请现在复制此链接——之后不会再显示。",
  },
  expires: {
    en: "Expires",
    ms: "Tamat pada",
    zh: "有效期至",
  },
  inviteListTitle: {
    en: "Sent invitations",
    ms: "Jemputan dihantar",
    zh: "已发送邀请",
  },
  inviteListHint: {
    en: "Older links cannot be shown again: only a hash is stored.",
    ms: "Pautan lama tidak boleh dipaparkan semula: hanya cap jari (hash) disimpan.",
    zh: "旧邀请的链接无法再次显示，因为系统只保存哈希值。",
  },
  roleOwner: {
    en: "Owner",
    ms: "Pemilik",
    zh: "负责人",
  },
  roleManager: {
    en: "Manager",
    ms: "Pengurus",
    zh: "经理",
  },
  roleStaff: {
    en: "Staff",
    ms: "Kakitangan",
    zh: "员工",
  },
  rolePlatform: {
    en: "Platform admin",
    ms: "Pentadbir platform",
    zh: "平台管理员",
  },
  allWorkspaces: {
    en: "All workspaces",
    ms: "Semua ruang kerja",
    zh: "所有租户",
  },
  unknownWorkspace: {
    en: "Unknown workspace",
    ms: "Ruang kerja tidak diketahui",
    zh: "未知租户",
  },
  createdLabel: {
    en: "Created",
    ms: "Dicipta",
    zh: "创建时间",
  },
  statusUsed: {
    en: "Used",
    ms: "Telah digunakan",
    zh: "已使用",
  },
  statusActive: {
    en: "Active",
    ms: "Aktif",
    zh: "有效",
  },
  statusExpired: {
    en: "Expired",
    ms: "Tamat tempoh",
    zh: "已过期",
  },
  noInvites: {
    en: "No invitations yet.",
    ms: "Tiada jemputan lagi.",
    zh: "暂无邀请。",
  },
  inviteError: {
    en: "Could not create the invite. Try again.",
    ms: "Jemputan tidak dapat dicipta. Cuba lagi.",
    zh: "无法创建邀请，请重试。",
  },
  invalidEmail: {
    en: "Enter a valid email address.",
    ms: "Masukkan alamat e-mel yang sah.",
    zh: "请输入有效的电邮地址。",
  },
  tenantRequired: {
    en: "Select a workspace.",
    ms: "Pilih ruang kerja.",
    zh: "请选择租户。",
  },
  listError: {
    en: "Could not load invitations.",
    ms: "Jemputan tidak dapat dimuatkan.",
    zh: "无法载入邀请。",
  },
  membersTitle: {
    en: "Members",
    ms: "Ahli",
    zh: "成员",
  },
  membersHint: {
    en: "Members of the selected workspace, with role and state.",
    ms: "Ahli ruang kerja yang dipilih, dengan peranan dan status.",
    zh: "所选租户的成员、角色与状态。",
  },
  selectWorkspace: {
    en: "Select workspace",
    ms: "Pilih ruang kerja",
    zh: "选择租户",
  },
  memberColumn: {
    en: "Member",
    ms: "Ahli",
    zh: "成员",
  },
  memberActive: {
    en: "Active",
    ms: "Aktif",
    zh: "启用",
  },
  memberInactive: {
    en: "Inactive",
    ms: "Tidak aktif",
    zh: "已停用",
  },
  noMembers: {
    en: "No members in this workspace.",
    ms: "Tiada ahli dalam ruang kerja ini.",
    zh: "此租户暂无成员。",
  },
  membersError: {
    en: "Could not load members.",
    ms: "Ahli tidak dapat dimuatkan.",
    zh: "无法载入成员。",
  },
} satisfies Record<string, Record<Locale, string>>;

export type PlatformCopyKey = keyof typeof platformCopy;

export function platformText(key: PlatformCopyKey, locale: Locale): string {
  return platformCopy[key][locale];
}
