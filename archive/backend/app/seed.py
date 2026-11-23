from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import ADMIN_BOOTSTRAP_PASSWORD, APP_ENV
from .db import SessionLocal, init_db
from .models import (
    AvailabilityRule,
    FaqItem,
    Offering,
    PageContent,
    SiteSettings,
    Staff,
    Tenant,
    TenantDomain,
)
from .security import hash_password
from .theme import resolve_theme
from .translations_ms import MS_CONTENT

TENANT_ID = "5e7a1c10-2b4f-4c1e-9f6a-8d3b7a2c4e01"
TENANT_SLUG = "setapak-dental-jb"

EN = "en"
ZH = "zh"
MS = "ms"


def bootstrap_password(app_env: str, configured: str) -> str:
    """Password for the first staff account.

    Production must supply its own; the well-known demo password is only
    available when APP_ENV is not "production".
    """
    if app_env == "production":
        if len(configured) < 10:
            raise RuntimeError(
                "Set ADMIN_BOOTSTRAP_PASSWORD (10+ characters) when APP_ENV=production."
            )
        return configured
    return configured or "demo1234"


def i18n(en: str, zh: str) -> dict[str, str]:
    return {EN: en, ZH: zh, MS: MS_CONTENT.get(en, en)}


PAGE_CONTENT: list[tuple[str, str, dict]] = [
    (
        "home",
        "seo",
        {
            "description": i18n(
                "General dental care in Taman Sri Tebrau, Johor Bahru. Open daily until 11 PM. Book an evening slot online.",
                "新山大丰花园全科牙科诊所，每日营业至晚上 11 点，可在线预约晚间时段。",
            ),
        },
    ),
    (
        "home",
        "hero",
        {
            "eyebrow": i18n("Taman Sri Tebrau · Johor Bahru", "新山大丰花园 · Taman Sri Tebrau"),
            "headline": i18n(
                "Dental care, open until 11 PM.",
                "夜间牙科，每天开到晚上 11 点。",
            ),
            "highlight": i18n("11 PM", "11 点"),
            "spec_line": i18n(
                "4.8 ★ from 850+ Google reviews · 2.6 km from the JB CIQ",
                "4.8 ★ 850+ Google 评价 · 距新柔关卡 2.6 公里",
            ),
            "primary_note": i18n(
                "RM 30 slot deposit, deducted from your treatment bill",
                "RM 30 时段订金，到诊直接抵扣诊疗费",
            ),
            "stats": [
                {
                    "value": i18n("4.8 ★", "4.8 ★"),
                    "label": i18n("850+ Google reviews", "850+ Google 评价"),
                },
                {
                    "value": i18n("11 PM", "晚上 11 点"),
                    "label": i18n("Open daily until", "每日营业至"),
                },
                {
                    "value": i18n("7 days", "每周 7 天"),
                    "label": i18n("Including weekends", "周末照常营业"),
                },
                {
                    "value": i18n("2.6 km", "2.6 公里"),
                    "label": i18n("From the JB CIQ", "距新柔关卡"),
                },
            ],
        },
    ),
    (
        "home",
        "pillars",
        {
            "heading": i18n("Before treatment begins.", "治疗开始前。"),
            "items": [
                {
                    "index": "01",
                    "title": i18n("Examination", "检查"),
                    "body": i18n(
                        "The dentist assesses the problem and explains the options before treatment begins.",
                        "牙医先检查问题，并在治疗前说明处理选项。",
                    ),
                },
                {
                    "index": "02",
                    "title": i18n("Treatment plan", "治疗方案"),
                    "body": i18n(
                        "A plan is confirmed with you. Root canal, crown and wisdom tooth procedures usually start with an examination and an X-ray.",
                        "与您确认治疗方案。根管治疗、牙冠与智齿通常先检查与拍片。",
                    ),
                },
                {
                    "index": "03",
                    "title": i18n("Transparent quote", "透明报价"),
                    "body": i18n(
                        "The clinic confirms the amount before treatment. Scaling is typically RM 80–150; the RM 30 deposit is deducted from the bill.",
                        "治疗前确认金额。洗牙一般 RM 80–150；RM 30 订金可抵扣诊疗费。",
                    ),
                },
            ],
        },
    ),
    (
        "home",
        "night",
        {
            "heading": i18n("Open when most clinics have closed.", "大多数诊所关门后，我们还开着。"),
            "body": i18n(
                "The clinic sees patients seven days a week until 11 PM. Evening appointments run until 10:30 PM, so you can come after work or cross the border after office hours.",
                "诊所每周七天营业至晚上 11 点，晚间预约开放至 22:30。下班后或过关后过来都可以。",
            ),
            "note": i18n("Last appointment 10:30 PM", "最后预约 22:30"),
            "facts": [
                {
                    "label": i18n("Practice", "诊所类型"),
                    "value": i18n("General dentistry", "全科牙科"),
                },
                {
                    "label": i18n("Open", "营业"),
                    "value": i18n("7 days", "每周 7 天"),
                },
                {
                    "label": i18n("Deposit", "订金"),
                    "value": i18n("RM 30, deducted", "RM 30，可抵扣"),
                },
            ],
        },
    ),
    (
        "home",
        "reviews",
        {
            "heading": i18n("4.8 out of 5 on Google.", "Google 评分 4.8 分。"),
            "body": i18n(
                "Three recent Google reviews, shown with the reviewer's name and star rating. Read all 853 reviews on Google Maps.",
                "以下为诊所最近的 3 条 Google 评价，保留评价者姓名与星级；中文为译文。全部 853 条评价请见 Google Maps。",
            ),
            "items": [
                {
                    "author": i18n("Food2Explore", "Food2Explore"),
                    "rating": 5,
                    "text": i18n(
                        "I went to this clinic because of their solid 5-star reviews, and they definitely did not disappoint!\n\nThe reception staff were friendly and professional. I was attended to by Dr. Lim about 15 minutes before my scheduled appointment. He took the time to explain the procedure clearly before proceeding, which made me feel comfortable and reassured throughout the process.\n\nThe whole experience was so comfortable that I hardly felt like I was going through a dental procedure at all!\n\nHighly recommended for anyone looking for a reliable, professional, and caring dental clinic.",
                        "我因为这家诊所的五星好评而来，果然没有让我失望！前台人员友善又专业。我在预约时间前约 15 分钟由 Dr. Lim 看诊。他在治疗前耐心清楚地解释流程，让我在整个过程中感到安心。整个体验非常舒适，我几乎不觉得是在做牙科治疗！非常推荐给任何在寻找可靠、专业又有爱心的牙科诊所的人。",
                    ),
                },
                {
                    "author": i18n("BK C", "BK C"),
                    "rating": 5,
                    "text": i18n(
                        "Came here for dental scaling and polishing.\nWas treated by Dr Karwitta Krishnan.\n\nMeticulous care was taken hence the entire process was very smooth and quite painless (for someone who didn’t do scaling for the past few years)!\nWill definitely recommend and be coming back for dental treatments in the future! 👍🏻👍🏻💯💯💯",
                        "来这里做洗牙和抛光，由 Dr Karwitta Krishnan 治疗。护理非常细致，所以整个过程很顺利，也几乎无痛（对几年没洗牙的人来说很难得）！一定会推荐，未来也会再回来做牙科治疗！👍🏻👍🏻💯💯💯",
                    ),
                },
                {
                    "author": i18n("Hema Dezoz", "Hema Dezoz"),
                    "rating": 5,
                    "text": i18n(
                        "I would like to compliment Tamil from the reception team for providing excellent customer service. Tamil was very friendly, polite, and helpful throughout the interaction. The warm welcome and professional attitude made me feel comfortable and valued. Tamil handled everything with patience and a positive attitude. Thank you for the excellent service and dedication. Keep up the great work!",
                        "我想表扬前台的 Tamil，服务非常出色。Tamil 在整个过程中非常友善、有礼、乐于助人。热情的欢迎和专业的态度让我感到舒适和被重视。Tamil 耐心且积极地处理一切。谢谢你们出色的服务和用心，继续保持！",
                    ),
                },
            ],
        },
    ),
    (
        "home",
        "location",
        {
            "heading": i18n("Taman Sri Tebrau, Johor Bahru.", "新山大丰花园。"),
            "body": i18n(
                "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru. About 2.6 km from the Woodlands CIQ, next to the KSL shopping area.",
                "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru。距 Woodlands 关卡约 2.6 公里，靠近 KSL 商圈。",
            ),
        },
    ),
    (
        "home",
        "cta",
        {
            "heading": i18n("An evening slot is one tap away.", "晚上的时段，几步就能预约。"),
            "body": i18n(
                "Choose a service and a time. Send the request to the clinic on WhatsApp. The RM 30 deposit is deducted from your final bill.",
                "选择服务与时间，通过 WhatsApp 把预约请求发送给诊所。RM 30 订金将直接抵扣诊疗费。",
            ),
        },
    ),
    (
        "about",
        "intro",
        {
            "heading": i18n("A general dental clinic in Taman Sri Tebrau.", "大丰花园的全科牙科。"),
            "motto": i18n("General dentistry, after hours.", "下班后的全科牙科。"),
            "paragraphs": [
                i18n(
                    "Klinik Pergigian Setapak is a private general dental practice at 61, Jalan Perisai, Taman Sri Tebrau, Johor Bahru. It is about 2.6 km from the Woodlands CIQ, within the KSL shopping area.",
                    "Klinik Pergigian Setapak 是位于新山大丰花园 Jalan Perisai 61 号的私人全科牙科诊所，距离 Woodlands 关卡约 2.6 公里，靠近 KSL 商圈。",
                ),
                i18n(
                    "The clinic operates seven days a week and closes at 11 PM. Services include general checkups, ultrasonic scaling and polishing, fillings, root canal treatment, crowns, and wisdom tooth removal.",
                    "诊所每周营业七天，晚上 11 点打烊。服务包括全口检查、超声波洗牙与抛光、补牙、根管治疗、牙冠修复及智齿拔除。",
                ),
                i18n(
                    "Online booking is a request, not an automatic confirmation. A staff member confirms your time on WhatsApp. Treatment plans and final fees are confirmed by the dentist after examination.",
                    "线上预约属于请求，并非自动确认。诊所人员会通过 WhatsApp 确认时间。治疗方案与最终费用由牙医检查后确认。",
                ),
            ],
        },
    ),
    (
        "services",
        "intro",
        {
            "heading": i18n("General dentistry, after hours.", "下班后的全科牙科。"),
            "body": i18n(
                "Start with the service that fits. Prices shown are indicative and confirmed by the dentist after examination.",
                "从适合你的服务开始。页面价格为参考，最终费用由牙医检查后确认。",
            ),
        },
    ),
    (
        "faq",
        "intro",
        {
            "heading": i18n("Before you come in.", "到诊前，你可能想知道。"),
            "body": i18n(
                "Hours, location, deposits and fees. For anything clinical, message the clinic directly.",
                "营业时间、地址、订金与费用。临床问题请直接联系诊所。",
            ),
        },
    ),
    (
        "booking",
        "intro",
        {
            "heading": i18n("Book a dental slot.", "预约牙科时段。"),
            "body": i18n(
                "Pick a service and an available time. The clinic confirms on WhatsApp. The RM 30 slot deposit is deducted from your treatment bill.",
                "选择服务与可预约时间。诊所会通过 WhatsApp 确认。RM 30 时段订金将抵扣诊疗费。",
            ),
        },
    ),
    (
        "contact",
        "intro",
        {
            "heading": i18n("Message the clinic.", "联系诊所。"),
            "body": i18n(
                "WhatsApp is the fastest way to reach the front desk, especially during evening clinic hours.",
                "WhatsApp 是联系前台最快的方式，晚间看诊时段尤其如此。",
            ),
        },
    ),
    (
        "legal",
        "privacy",
        {
            "title": i18n("Privacy notice", "隐私声明"),
            "updated": "2026-11-19",
            "sections": [
                {
                    "heading": i18n("What this site collects", "本站收集的资料"),
                    "paragraphs": [
                        i18n(
                            "When you request an appointment, this site collects your name, mobile number, selected service, preferred time, language, and the time you gave consent. For contact matching, the clinic dashboard stores a masked number such as 6017***100.",
                            "当你提交预约请求时，本站会收集你的姓名、手机号码、所选服务、希望时段、语言以及同意时间。为方便前台核对，诊所后台只保存遮蔽后的号码，例如 6017***100。",
                        ),
                        i18n(
                            "Your full number is not kept in the site database. It is either included in the WhatsApp message you choose to send to the clinic, or forwarded to the clinic's private webhook if the clinic has configured one.",
                            "完整号码不会保存在本站数据库。它只会出现在你主动发送给诊所的 WhatsApp 信息中；若诊所已设置私人 webhook，则会转发到该 webhook。",
                        ),
                    ],
                },
                {
                    "heading": i18n("Payments and receipts", "付款与收据"),
                    "paragraphs": [
                        i18n(
                            "Payment receipts are relayed to the clinic when online deposit details are enabled. Receipt images are not stored in this site database.",
                            "当线上订金功能启用时，付款收据会转交给诊所。收据图片不会保存在本站数据库。",
                        ),
                        i18n(
                            "The RM 30 slot deposit is deducted from your treatment bill. Final treatment fees are confirmed by the dentist.",
                            "RM 30 时段订金将抵扣诊疗费。最终治疗费用由牙医确认。",
                        ),
                    ],
                },
                {
                    "heading": i18n("Storage and consent", "存储与同意"),
                    "paragraphs": [
                        i18n(
                            "Your browser stores your language choice and this notice's acknowledgement. No advertising or cross-site tracking cookies are used.",
                            "浏览器只保存你的语言选择与本声明的确认状态。本站不使用广告或跨站追踪 cookie。",
                        ),
                        i18n(
                            "Booking and inquiry records are kept for clinic administration. You can ask the clinic to access or correct your details by messaging them on WhatsApp.",
                            "预约与询问记录用于诊所行政用途。你可以通过 WhatsApp 联系诊所，要求查阅或更正你的资料。",
                        ),
                        i18n(
                            "This notice covers this website. Clinical records held by the clinic are governed by the clinic's own policies under Malaysia's Personal Data Protection Act 2010.",
                            "本声明适用于本网站。诊所持有的病历资料依马来西亚《2010 年个人资料保护法》及诊所自身政策处理。",
                        ),
                    ],
                },
            ],
        },
    ),
    (
        "legal",
        "terms",
        {
            "title": i18n("Terms of use", "使用条款"),
            "updated": "2026-11-19",
            "sections": [
                {
                    "heading": i18n("Appointment requests", "预约请求"),
                    "paragraphs": [
                        i18n(
                            "A booking submitted here is a request. It is not a confirmed appointment until the clinic replies on WhatsApp. The clinic may decline or propose another time.",
                            "在此提交的预约属于请求，直到诊所通过 WhatsApp 回复确认前，均不构成已确认预约。诊所可拒绝或建议其他时间。",
                        ),
                        i18n(
                            "Please arrive before your slot. Walk-in patients are seen subject to the queue, so a confirmed slot is the more reliable option for evening visits.",
                            "请在该时段前抵达。现场挂号需依排队情况安排，晚间到诊建议提前确认时段。",
                        ),
                    ],
                },
                {
                    "heading": i18n("Deposits and fees", "订金与费用"),
                    "paragraphs": [
                        i18n(
                            "Where shown, the RM 30 slot deposit is deducted from the treatment bill. It is not a separate consultation charge. Rescheduling and refund requests are handled by the clinic; ask before paying.",
                            "页面所示 RM 30 时段订金将抵扣诊疗费，并非额外咨询费。改期与退款请求由诊所处理，请在付款前询问。",
                        ),
                        i18n(
                            "Prices on this site are indicative. The final fee is confirmed by the dentist after examination and, where needed, X-rays.",
                            "本站价格为参考。最终费用由牙医检查后确认，必要时包括 X 光检查。",
                        ),
                    ],
                },
                {
                    "heading": i18n("No medical guarantee", "不构成医疗保证"),
                    "paragraphs": [
                        i18n(
                            "Information here is general and is not a diagnosis or treatment promise. Outcomes vary by clinical condition. For severe pain, facial swelling, bleeding or trauma, contact the clinic immediately; in an emergency, go to the nearest hospital.",
                            "本站资料仅供一般参考，不构成诊断或治疗承诺。治疗结果因临床情况而异。如出现剧烈疼痛、面部肿胀、出血或外伤，请立即联系诊所；紧急情况请前往最近医院。",
                        ),
                        i18n(
                            "These terms are governed by the laws of Malaysia.",
                            "本条款受马来西亚法律管辖。",
                        ),
                    ],
                },
            ],
        },
    ),
    (
        "doctors",
        "intro",
        {
            "eyebrow": i18n("Our dentists", "牙医团队"),
            "heading": i18n(
                "A team you can meet before the treatment plan.",
                "先认识牙医，再谈治疗方案。",
            ),
            "body": i18n(
                "The clinic sees patients seven days a week, including evening appointments. Ask the front desk which dentist is on duty for your slot. Team photos and full profiles will be replaced once the clinic supplies them.",
                "诊所每周七天看诊，晚间也开放预约。你可以在预约前先了解团队，前台会确认你的时段由哪位牙医看诊。团队照片与完整简介将在诊所提供后替换。",
            ),
            "items": [
                {
                    "id": "doctor-lim",
                    "name": i18n("Dr. Lim", "Dr. Lim"),
                    "role": i18n("Dentist", "牙医"),
                    "bio": i18n(
                        "General dental care and examinations. Profile and credentials to be confirmed by the clinic.",
                        "提供一般牙科检查与治疗。个人简介与资历待诊所确认。",
                    ),
                    "photo": "/images/doctor-placeholder-1.svg",
                },
                {
                    "id": "doctor-karwitta-krishnan",
                    "name": i18n("Dr. Karwitta Krishnan", "Dr. Karwitta Krishnan"),
                    "role": i18n("Dentist", "牙医"),
                    "bio": i18n(
                        "General dental care and patient follow-up. Profile and credentials to be confirmed by the clinic.",
                        "提供一般牙科治疗与复诊跟进。个人简介与资历待诊所确认。",
                    ),
                    "photo": "/images/doctor-placeholder-2.svg",
                },
                {
                    "id": "doctor-tan",
                    "name": i18n("Dr. Tan", "Dr. Tan"),
                    "role": i18n("Dentist", "牙医"),
                    "bio": i18n(
                        "Evening appointments and general dental care. Profile and credentials to be confirmed by the clinic.",
                        "负责晚间预约与一般牙科治疗。个人简介与资历待诊所确认。",
                    ),
                    "photo": "/images/doctor-placeholder-3.svg",
                },
                {
                    "id": "doctor-nabila",
                    "name": i18n("Dr. Nabila", "Dr. Nabila"),
                    "role": i18n("Dentist", "牙医"),
                    "bio": i18n(
                        "Weekend appointments and general dental care. Profile and credentials to be confirmed by the clinic.",
                        "负责周末预约与一般牙科治疗。个人简介与资历待诊所确认。",
                    ),
                    "photo": "/images/doctor-placeholder-4.svg",
                },
            ],
        },
    ),
]


def ensure_doctors_content(db: Session, tenant: Tenant) -> None:
    """Add the doctors section to an existing demo database without a rebuild."""
    existing = db.scalar(
        select(PageContent).where(
            PageContent.tenant_id == tenant.id,
            PageContent.page == "doctors",
            PageContent.section == "intro",
        )
    )
    if existing:
        return
    doctors = next(
        (data for page, section, data in PAGE_CONTENT if page == "doctors" and section == "intro"),
        None,
    )
    if not doctors:
        return
    db.add(
        PageContent(
            tenant_id=tenant.id,
            page="doctors",
            section="intro",
            data=doctors,
            sort=0,
        )
    )
    db.commit()


def ensure_seo_description(db: Session, tenant: Tenant) -> None:
    """Add home.seo.description to an existing demo database (link previews, meta)."""
    data = next(
        (data for page, section, data in PAGE_CONTENT if page == "home" and section == "seo"),
        None,
    )
    if not data or not (data.get("description") or {}).get("en"):
        return
    row = db.scalar(
        select(PageContent).where(
            PageContent.tenant_id == tenant.id,
            PageContent.page == "home",
            PageContent.section == "seo",
        )
    )
    if row:
        if (row.data or {}).get("description"):
            return
        row.data = {**(row.data or {}), "description": data["description"]}
    else:
        db.add(PageContent(tenant_id=tenant.id, page="home", section="seo", data=data))
    db.commit()


OFFERINGS = [
    {
        "slug": "evening-emergency-toothache-care",
        "kind": "service",
        "title": i18n(
            "After-hours toothache & emergency dental care",
            "夜间牙痛急诊与急性牙髓处理",
        ),
        "summary": i18n(
            "Priority evening slots until 11 PM for sudden toothaches, broken fillings, swelling, and urgent dental pain.",
            "晚间营业至 11 点，为突发牙痛、补牙脱落及牙龈肿痛提供优先处理。",
        ),
        "body": i18n(
            "Evening slots for sudden toothache, a lost filling, a broken tooth, swelling, or a dental injury. The dentist assesses the problem, explains the options, and confirms the cost before treatment.",
            "适合突发牙痛、补牙脱落、牙齿崩裂、牙龈肿痛或牙外伤的晚间时段。牙医会先检查、说明处理选项，并在治疗前确认费用。",
        ),
        "price_cents": None,
        "deposit_cents": 3000,
        "currency": "MYR",
        "price_note": i18n(
            "Final cost depends on the treatment needed.",
            "最终费用视所需治疗而定。",
        ),
        "attributes": {
            "duration_min": 45,
            "format": "in-person",
            "preparation_notes": i18n(
                "Book ahead to avoid the evening walk-in queue. Bring any medication you are currently taking.",
                "提前预约可避开晚间现场排队。请带上你正在服用的药物。",
            ),
        },
        "status": "published",
        "sort": 1,
    },
    {
        "slug": "scaling-polishing-checkup",
        "kind": "service",
        "title": i18n(
            "Ultrasonic scaling, polishing & oral checkup",
            "超声波洗牙抛光与全口检查",
        ),
        "summary": i18n(
            "Tartar and stain removal with a full dental examination, available after work or on weekends.",
            "清除牙结石与烟茶渍，并做全口检查。下班后或周末都能预约。",
        ),
        "body": i18n(
            "Ultrasonic scaling removes tartar and surface stains above the gumline, followed by polishing and a full oral examination. The fee depends on tartar buildup; the clinic confirms the exact amount before treatment.",
            "超声波洗牙清除牙龈以上的牙结石与表面牙渍，之后进行抛光和全口检查。费用视牙结石程度而定，诊所会在治疗前确认金额。",
        ),
        "price_cents": 8000,
        "deposit_cents": 3000,
        "currency": "MYR",
        "price_note": i18n(
            "Typical range RM 80–150, confirmed after examination",
            "一般介于 RM 80–150，检查后确认",
        ),
        "attributes": {
            "duration_min": 45,
            "format": "in-person",
            "preparation_notes": i18n(
                "No special preparation needed. Tell the dentist if you have sensitive teeth or a heart condition.",
                "无需特别准备。如有牙齿敏感或心脏问题，请提前告知牙医。",
            ),
        },
        "status": "published",
        "sort": 2,
    },
    {
        "slug": "root-canal-crown-restoration",
        "kind": "service",
        "title": i18n(
            "Root canal treatment, crowns & wisdom tooth surgery",
            "根管治疗、全瓷牙冠与智齿拔除",
        ),
        "summary": i18n(
            "Restorative dentistry and wisdom tooth removal, with a clear estimate before treatment begins.",
            "根管治疗、牙冠修复与智齿拔除，治疗前提供清晰费用评估。",
        ),
        "body": i18n(
            "Root canal treatment, crowns, and wisdom tooth removal. An examination and usually an X-ray come first. The clinic provides an estimate and treatment plan before proceeding.",
            "提供根管治疗（杜牙根）、牙冠修复与智齿拔除。通常先进行检查与 X 光，诊所会在治疗前提供费用评估与治疗计划。",
        ),
        "price_cents": None,
        "deposit_cents": 3000,
        "currency": "MYR",
        "price_note": i18n(
            "Examination and X-ray before a treatment plan.",
            "先检查与拍片，再确认治疗方案。",
        ),
        "attributes": {
            "duration_min": 60,
            "format": "in-person",
            "preparation_notes": i18n(
                "Eat before your visit unless the dentist advises otherwise. Bring previous X-rays if you have them.",
                "除非牙医另有指示，请先用餐。如有旧 X 光片请一并带来。",
            ),
        },
        "status": "published",
        "sort": 3,
    },
]


FAQ = [
    (
        "When is the clinic open?",
        "诊所几点营业？",
        "Monday to Wednesday 12 PM–11 PM, Thursday 2 PM–11 PM, Friday to Sunday 10 AM–11 PM. The last appointment is 10:30 PM.",
        "周一至周三 12:00–23:00，周四 14:00–23:00，周五至周日 10:00–23:00。最后一个预约时段为 22:30。",
    ),
    (
        "Where is the clinic?",
        "诊所在哪里？",
        "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor. About 2.6 km from the Woodlands CIQ.",
        "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor。距 Woodlands 关卡约 2.6 公里。",
    ),
    (
        "Do I need an appointment?",
        "需要提前预约吗？",
        "Walk-in patients are accepted subject to the queue. Evening walk-ins can be busy, so booking a slot online is the safer option if you want a specific time.",
        "现场挂号可依排队情况安排，晚间人潮较多。若想指定时间，建议先在线预约时段。",
    ),
    (
        "What is the RM 30 deposit for?",
        "RM 30 订金是什么？",
        "It holds your slot and is deducted from your treatment bill. It is not an extra consultation fee. The clinic will confirm payment and rescheduling on WhatsApp.",
        "订金用于保留时段，并会直接抵扣诊疗费，并非额外咨询费。付款与改期安排由诊所通过 WhatsApp 确认。",
    ),
    (
        "How much does scaling cost?",
        "洗牙多少钱？",
        "Ultrasonic scaling, polishing and a checkup are typically RM 80–150 depending on tartar buildup. The clinic confirms the amount after examination.",
        "超声波洗牙、抛光与检查一般介于 RM 80–150，视牙结石程度而定。诊所会在检查后确认金额。",
    ),
    (
        "How much do root canal, crowns or wisdom tooth removal cost?",
        "根管治疗、牙冠或拔智齿多少钱？",
        "These procedures are quoted after examination and, where needed, an X-ray. The clinic provides an estimate before treatment starts.",
        "这些项目会在检查后报价，必要时包括 X 光。诊所会在治疗开始前提供费用评估。",
    ),
]


AVAILABILITY = [
    (1, "12:00", "22:30"),
    (2, "12:00", "22:30"),
    (3, "12:00", "22:30"),
    (4, "14:00", "22:30"),
    (5, "10:00", "22:30"),
    (6, "10:00", "22:30"),
    (0, "10:00", "22:30"),
]


def seed(db: Session) -> None:
    existing = db.scalar(select(Tenant).where(Tenant.slug == TENANT_SLUG))
    if existing:
        ensure_doctors_content(db, existing)
        ensure_seo_description(db, existing)
        return

    tenant = Tenant(id=TENANT_ID, slug=TENANT_SLUG, status="active", plan="starter")
    db.add(tenant)
    db.flush()

    for hostname, primary in (
        (TENANT_SLUG, False),
        (f"{TENANT_SLUG}.localhost", False),
        ("localhost", False),
    ):
        db.add(TenantDomain(hostname=hostname, tenant_id=TENANT_ID, is_primary=primary))

    db.add(
        SiteSettings(
            tenant_id=TENANT_ID,
            brand_name=i18n("Klinik Pergigian Setapak", "Setapak 牙科诊所"),
            preset_key="appointment",
            archetype="appointment",
            default_locale="en",
            locales=["en", "ms"],
            timezone="Asia/Kuala_Lumpur",
            theme=resolve_theme(
                {"preset": "slate-mist", "typography": "editorial", "layout": "hero-centered"}
            ),
            features={"booking": True, "pricing": True, "faq": True, "blog": False},
            labels={
                "offerings_plural": i18n("Dental services", "牙科诊疗服务"),
                "offerings_singular": i18n("Service", "诊疗服务"),
                "book_cta": i18n("Book a slot", "预约时段"),
                "staff_label": i18n("Dentist", "值班牙医"),
                "deposit_label": i18n("Slot deposit", "时段订金"),
            },
            contact={
                "whatsapp": "60177410100",
                "phone": "+60 17-741 0100",
                "email": "",
                "address": i18n(
                    "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor",
                    "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor",
                ),
                "map_url": "https://www.google.com/maps/search/?api=1&query=Klinik+Pergigian+Setapak+Johor+Bahru",
                "opening_hours": i18n(
                    "Mon–Wed: 12 PM – 11 PM · Thu: 2 PM – 11 PM · Fri–Sun: 10 AM – 11 PM",
                    "周一至周三 12:00–23:00 · 周四 14:00–23:00 · 周五至周日 10:00–23:00",
                ),
                "closes_at": "23:00",
                "last_appointment": "22:30",
            },
            booking_mode="approval",
            reminder_hours=24,
            checkout_mode="manual_qr_proof",
            payment_config={
                "bank_name": "",
                "account_number": "",
                "account_holder": "",
                "qr_image_url": "",
                "merchant_webhook_url": "",
            },
            analytics={},
            consent_text=i18n(
                "I agree to be contacted about this request and have read the",
                "我同意诊所就此请求与我联系，并已阅读",
            ),
        )
    )

    for page, section, data in PAGE_CONTENT:
        db.add(PageContent(tenant_id=TENANT_ID, page=page, section=section, data=data))

    offering_ids: dict[str, str] = {}
    for item in OFFERINGS:
        offering = Offering(tenant_id=TENANT_ID, **item)
        db.add(offering)
        db.flush()
        offering_ids[item["slug"]] = offering.id

    for index, (question_en, question_zh, answer_en, answer_zh) in enumerate(FAQ, start=1):
        db.add(
            FaqItem(
                tenant_id=TENANT_ID,
                question=i18n(question_en, question_zh),
                answer=i18n(answer_en, answer_zh),
                sort=index,
                published=True,
            )
        )

    for weekday, start, end in AVAILABILITY:
        db.add(
            AvailabilityRule(
                tenant_id=TENANT_ID,
                weekday=weekday,
                start_time=start,
                end_time=end,
                slot_minutes=45,
                buffer_minutes=15,
                active=True,
            )
        )

    db.add(
        Staff(
            tenant_id=TENANT_ID,
            login_id="60177410100",
            display_name="Front desk",
            role="owner",
            password_hash=hash_password(
                bootstrap_password(APP_ENV, ADMIN_BOOTSTRAP_PASSWORD)
            ),
            active=True,
        )
    )

    db.commit()


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed(db)
        print(f"Seeded tenant {TENANT_SLUG}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
