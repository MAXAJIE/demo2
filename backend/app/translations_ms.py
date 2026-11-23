"""Bahasa Melayu copy for seeded marketing content.

The database keeps the original English and Chinese columns. This lookup adds a
Malay layer at serialisation time so existing sites pick up the new language
without a destructive re-seed, while a fresh seed stores the same values.
"""

from __future__ import annotations

from typing import Any

MS_CONTENT: dict[str, str] = {
    "Taman Sri Tebrau · Johor Bahru": "Taman Sri Tebrau · Johor Bahru",
    "Dental care, open until 11 PM.": "Penjagaan pergigian, dibuka sehingga 11 malam.",
    "11 PM": "11 malam",
    "4.8 ★ from 850+ Google reviews · 2.6 km from the JB CIQ": "4.8 ★ daripada lebih 850 ulasan Google · 2.6 km dari CIQ JB",
    "RM 30 slot deposit, deducted from your treatment bill": "Deposit slot RM 30, ditolak daripada bil rawatan anda",
    "4.8 ★": "4.8 ★",
    "850+ Google reviews": "Lebih 850 ulasan Google",
    "Open daily until": "Dibuka setiap hari sehingga",
    "7 days": "7 hari",
    "Including weekends": "Termasuk hujung minggu",
    "2.6 km": "2.6 km",
    "From the JB CIQ": "Dari CIQ JB",
    "Before treatment begins.": "Sebelum rawatan dimulakan.",
    "Examination": "Pemeriksaan",
    "The dentist assesses the problem and explains the options before treatment begins.": "Doktor gigi menilai masalah dan menerangkan pilihan sebelum rawatan dimulakan.",
    "Treatment plan": "Pelan rawatan",
    "A plan is confirmed with you. Root canal, crown and wisdom tooth procedures usually start with an examination and an X-ray.": "Pelan disahkan bersama anda. Prosedur saluran akar, mahkota dan gigi bongsu biasanya bermula dengan pemeriksaan dan X-ray.",
    "Transparent quote": "Sebut harga telus",
    "The clinic confirms the amount before treatment. Scaling is typically RM 80–150; the RM 30 deposit is deducted from the bill.": "Klinik mengesahkan jumlah sebelum rawatan. Pembersihan skala biasanya RM 80–150; deposit RM 30 ditolak daripada bil.",
    "Open when most clinics have closed.": "Dibuka ketika kebanyakan klinik sudah tutup.",
    "The clinic sees patients seven days a week until 11 PM. Evening appointments run until 10:30 PM, so you can come after work or cross the border after office hours.": "Klinik menerima pesakit tujuh hari seminggu sehingga 11 malam. Temujanji petang berjalan sehingga 10:30 malam, jadi anda boleh datang selepas kerja atau selepas waktu pejabat.",
    "Last appointment 10:30 PM": "Temujanji terakhir 10:30 malam",
    "Practice": "Bidang",
    "General dentistry": "Pergigian am",
    "Open": "Dibuka",
    "Deposit": "Deposit",
    "RM 30, deducted": "RM 30, ditolak",
    "4.8 out of 5 on Google.": "4.8 daripada 5 di Google.",
    "Three recent Google reviews, shown with the reviewer's name and star rating. Read all 853 reviews on Google Maps.": "Tiga ulasan Google terkini, dipaparkan dengan nama pengulas dan penarafan bintang. Teks Bahasa Melayu ialah terjemahan. Baca semua 853 ulasan di Google Maps.",
    "Food2Explore": "Food2Explore",
    "I went to this clinic because of their solid 5-star reviews, and they definitely did not disappoint!\n\nThe reception staff were friendly and professional. I was attended to by Dr. Lim about 15 minutes before my scheduled appointment. He took the time to explain the procedure clearly before proceeding, which made me feel comfortable and reassured throughout the process.\n\nThe whole experience was so comfortable that I hardly felt like I was going through a dental procedure at all!\n\nHighly recommended for anyone looking for a reliable, professional, and caring dental clinic.": "Saya pergi ke klinik ini kerana ulasan 5 bintangnya yang kukuh, dan ia sama sekali tidak mengecewakan!\n\nKakitangan kaunter mesra dan profesional. Saya dilayan oleh Dr. Lim kira-kira 15 minit sebelum temujanji yang dijadualkan. Beliau meluangkan masa menerangkan prosedur dengan jelas sebelum meneruskannya, sehingga saya berasa selesa dan yakin sepanjang proses.\n\nSeluruh pengalaman begitu selesa sehingga saya hampir tidak terasa sedang menjalani prosedur pergigian!\n\nSangat disyorkan untuk sesiapa yang mencari klinik pergigian yang boleh dipercayai, profesional dan penyayang.",
    "BK C": "BK C",
    "Came here for dental scaling and polishing.\nWas treated by Dr Karwitta Krishnan.\n\nMeticulous care was taken hence the entire process was very smooth and quite painless (for someone who didn’t do scaling for the past few years)!\nWill definitely recommend and be coming back for dental treatments in the future! 👍🏻👍🏻💯💯💯": "Datang ke sini untuk pembersihan skala dan penggilapan gigi.\nDirawat oleh Dr Karwitta Krishnan.\n\nPenjagaan yang teliti diberikan, jadi seluruh proses berjalan lancar dan hampir tidak menyakitkan (bagi seseorang yang tidak menjalani pembersihan skala selama beberapa tahun)!\nPasti akan mengesyorkan dan akan kembali untuk rawatan pergigian pada masa hadapan! 👍🏻👍🏻💯💯💯",
    "Hema Dezoz": "Hema Dezoz",
    "I would like to compliment Tamil from the reception team for providing excellent customer service. Tamil was very friendly, polite, and helpful throughout the interaction. The warm welcome and professional attitude made me feel comfortable and valued. Tamil handled everything with patience and a positive attitude. Thank you for the excellent service and dedication. Keep up the great work!": "Saya ingin memuji Tamil daripada pasukan kaunter kerana memberikan perkhidmatan pelanggan yang cemerlang. Tamil sangat mesra, sopan dan membantu sepanjang interaksi. Sambutan hangat dan sikap profesional membuatkan saya berasa selesa dan dihargai. Tamil menguruskan semuanya dengan sabar dan positif. Terima kasih atas perkhidmatan dan dedikasi yang cemerlang. Teruskan kerja yang baik!",
    "Taman Sri Tebrau, Johor Bahru.": "Taman Sri Tebrau, Johor Bahru.",
    "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru. About 2.6 km from the Woodlands CIQ, next to the KSL shopping area.": "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru. Kira-kira 2.6 km dari CIQ Woodlands, bersebelahan kawasan beli-belah KSL.",
    "An evening slot is one tap away.": "Slot petang hanya sejauh satu ketukan.",
    "Choose a service and a time. Send the request to the clinic on WhatsApp. The RM 30 deposit is deducted from your final bill.": "Pilih perkhidmatan dan masa. Hantar permintaan kepada klinik melalui WhatsApp. Deposit RM 30 ditolak daripada bil akhir anda.",
    "A general dental clinic in Taman Sri Tebrau.": "Klinik pergigian am di Taman Sri Tebrau.",
    "General dentistry, after hours.": "Pergigian am, selepas waktu kerja.",
    "Klinik Pergigian Setapak is a private general dental practice at 61, Jalan Perisai, Taman Sri Tebrau, Johor Bahru. It is about 2.6 km from the Woodlands CIQ, within the KSL shopping area.": "Klinik Pergigian Setapak ialah amalan pergigian am swasta di 61, Jalan Perisai, Taman Sri Tebrau, Johor Bahru. Ia kira-kira 2.6 km dari CIQ Woodlands, dalam kawasan beli-belah KSL.",
    "The clinic operates seven days a week and closes at 11 PM. Services include general checkups, ultrasonic scaling and polishing, fillings, root canal treatment, crowns, and wisdom tooth removal.": "Klinik beroperasi tujuh hari seminggu dan tutup pada 11 malam. Perkhidmatan termasuk pemeriksaan am, pembersihan skala ultrasonik dan penggilapan, tampalan, rawatan saluran akar, mahkota dan penyingkiran gigi bongsu.",
    "Online booking is a request, not an automatic confirmation. A staff member confirms your time on WhatsApp. Treatment plans and final fees are confirmed by the dentist after examination.": "Tempahan dalam talian ialah permintaan, bukan pengesahan automatik. Kakitangan akan mengesahkan masa anda di WhatsApp. Pelan rawatan dan yuran akhir disahkan oleh doktor gigi selepas pemeriksaan.",
    "Start with the service that fits. Prices shown are indicative and confirmed by the dentist after examination.": "Mulakan dengan perkhidmatan yang sesuai. Harga yang dipaparkan adalah indikatif dan disahkan oleh doktor gigi selepas pemeriksaan.",
    "Before you come in.": "Sebelum anda datang.",
    "Hours, location, deposits and fees. For anything clinical, message the clinic directly.": "Waktu operasi, lokasi, deposit dan yuran. Untuk perkara klinikal, hubungi klinik secara terus.",
    "Book a dental slot.": "Tempah slot pergigian.",
    "Pick a service and an available time. The clinic confirms on WhatsApp. The RM 30 slot deposit is deducted from your treatment bill.": "Pilih perkhidmatan dan masa yang tersedia. Klinik mengesahkan di WhatsApp. Deposit slot RM 30 ditolak daripada bil rawatan anda.",
    "Message the clinic.": "Hubungi klinik.",
    "WhatsApp is the fastest way to reach the front desk, especially during evening clinic hours.": "WhatsApp ialah cara terpantas untuk menghubungi kaunter hadapan, terutamanya pada waktu petang.",
    "Privacy notice": "Notis privasi",
    "What this site collects": "Apa yang laman ini kumpulkan",
    "When you request an appointment, this site collects your name, mobile number, selected service, preferred time, language, and the time you gave consent. For contact matching, the clinic dashboard stores a masked number such as 6017***100.": "Apabila anda meminta temujanji, laman ini mengumpulkan nama, nombor mudah alih, perkhidmatan pilihan, masa pilihan, bahasa dan masa persetujuan anda. Untuk pemadanan hubungan, papan pemuka klinik menyimpan nombor bertopeng seperti 6017***100.",
    "Your full number is not kept in the site database. It is either included in the WhatsApp message you choose to send to the clinic, or forwarded to the clinic's private webhook if the clinic has configured one.": "Nombor penuh anda tidak disimpan dalam pangkalan data laman. Ia sama ada dimasukkan dalam mesej WhatsApp yang anda pilih untuk dihantar kepada klinik, atau diteruskan ke webhook peribadi klinik jika klinik telah mengkonfigurasikannya.",
    "Payments and receipts": "Pembayaran dan resit",
    "Payment receipts are relayed to the clinic when online deposit details are enabled. Receipt images are not stored in this site database.": "Resit pembayaran diteruskan kepada klinik apabila butiran deposit dalam talian diaktifkan. Imej resit tidak disimpan dalam pangkalan data laman ini.",
    "The RM 30 slot deposit is deducted from your treatment bill. Final treatment fees are confirmed by the dentist.": "Deposit slot RM 30 ditolak daripada bil rawatan anda. Yuran rawatan akhir disahkan oleh doktor gigi.",
    "Storage and consent": "Penyimpanan dan persetujuan",
    "Your browser stores your language choice and this notice's acknowledgement. No advertising or cross-site tracking cookies are used.": "Pelayar anda menyimpan pilihan bahasa dan pengesahan notis ini. Tiada kuki pengiklanan atau penjejakan merentas laman digunakan.",
    "Booking and inquiry records are kept for clinic administration. You can ask the clinic to access or correct your details by messaging them on WhatsApp.": "Rekod tempahan dan pertanyaan disimpan untuk pentadbiran klinik. Anda boleh meminta klinik mengakses atau membetulkan butiran anda dengan menghubungi mereka di WhatsApp.",
    "This notice covers this website. Clinical records held by the clinic are governed by the clinic's own policies under Malaysia's Personal Data Protection Act 2010.": "Notis ini meliputi laman web ini. Rekod klinikal yang dipegang oleh klinik tertakluk kepada dasar klinik sendiri di bawah Akta Perlindungan Data Peribadi 2010 Malaysia.",
    "Terms of use": "Terma penggunaan",
    "Appointment requests": "Permintaan temujanji",
    "A booking submitted here is a request. It is not a confirmed appointment until the clinic replies on WhatsApp. The clinic may decline or propose another time.": "Tempahan yang dihantar di sini ialah permintaan. Ia bukan temujanji yang disahkan sehingga klinik membalas di WhatsApp. Klinik boleh menolak atau mencadangkan masa lain.",
    "Please arrive before your slot. Walk-in patients are seen subject to the queue, so a confirmed slot is the more reliable option for evening visits.": "Sila datang sebelum slot anda. Pesakit walk-in dilayan tertakluk kepada giliran, jadi slot yang disahkan ialah pilihan lebih boleh dipercayai untuk kunjungan petang.",
    "Deposits and fees": "Deposit dan yuran",
    "Where shown, the RM 30 slot deposit is deducted from the treatment bill. It is not a separate consultation charge. Rescheduling and refund requests are handled by the clinic; ask before paying.": "Jika dipaparkan, deposit slot RM 30 ditolak daripada bil rawatan. Ia bukan caj perundingan berasingan. Permintaan penjadualan semula dan bayaran balik diuruskan oleh klinik; tanya sebelum membayar.",
    "Prices on this site are indicative. The final fee is confirmed by the dentist after examination and, where needed, X-rays.": "Harga di laman ini adalah indikatif. Yuran akhir disahkan oleh doktor gigi selepas pemeriksaan dan, jika perlu, X-ray.",
    "No medical guarantee": "Tiada jaminan perubatan",
    "Information here is general and is not a diagnosis or treatment promise. Outcomes vary by clinical condition. For severe pain, facial swelling, bleeding or trauma, contact the clinic immediately; in an emergency, go to the nearest hospital.": "Maklumat di sini bersifat umum dan bukan diagnosis atau janji rawatan. Hasil berbeza mengikut keadaan klinikal. Untuk sakit teruk, bengkak muka, pendarahan atau trauma, hubungi klinik dengan segera; dalam kecemasan, pergi ke hospital terdekat.",
    "These terms are governed by the laws of Malaysia.": "Terma ini tertakluk kepada undang-undang Malaysia.",
    "After-hours toothache & emergency dental care": "Penjagaan sakit gigi selepas waktu & kecemasan pergigian",
    "Priority evening slots until 11 PM for sudden toothaches, broken fillings, swelling, and urgent dental pain.": "Slot petang keutamaan sehingga 11 malam untuk sakit gigi mengejut, tampalan pecah, bengkak dan sakit gigi yang mendesak.",
    "Evening slots for sudden toothache, a lost filling, a broken tooth, swelling, or a dental injury. The dentist assesses the problem, explains the options, and confirms the cost before treatment.": "Slot petang untuk sakit gigi mengejut, tampalan tertanggal, gigi patah, bengkak atau kecederaan gigi. Doktor gigi menilai masalah, menerangkan pilihan dan mengesahkan kos sebelum rawatan.",
    "Final cost depends on the treatment needed.": "Kos akhir bergantung pada rawatan yang diperlukan.",
    "Book ahead to avoid the evening walk-in queue. Bring any medication you are currently taking.": "Tempah awal untuk mengelakkan barisan walk-in petang. Bawa sebarang ubat yang sedang anda ambil.",
    "Ultrasonic scaling, polishing & oral checkup": "Pembersihan skala ultrasonik, penggilapan & pemeriksaan mulut",
    "Tartar and stain removal with a full dental examination, available after work or on weekends.": "Penyingkiran tartar dan kesan stain dengan pemeriksaan pergigian penuh, tersedia selepas kerja atau pada hujung minggu.",
    "Ultrasonic scaling removes tartar and surface stains above the gumline, followed by polishing and a full oral examination. The fee depends on tartar buildup; the clinic confirms the exact amount before treatment.": "Pembersihan skala ultrasonik menyingkirkan tartar dan kesan pada permukaan di atas garis gusi, diikuti penggilapan dan pemeriksaan mulut penuh. Yuran bergantung pada pembentukan tartar; klinik mengesahkan jumlah tepat sebelum rawatan.",
    "Typical range RM 80–150, confirmed after examination": "Julat biasa RM 80–150, disahkan selepas pemeriksaan",
    "No special preparation needed. Tell the dentist if you have sensitive teeth or a heart condition.": "Tiada persediaan khas diperlukan. Beritahu doktor gigi jika anda mempunyai gigi sensitif atau masalah jantung.",
    "Root canal treatment, crowns & wisdom tooth surgery": "Rawatan saluran akar, mahkota & pembedahan gigi bongsu",
    "Restorative dentistry and wisdom tooth removal, with a clear estimate before treatment begins.": "Pergigian pemulihan dan penyingkiran gigi bongsu, dengan anggaran jelas sebelum rawatan bermula.",
    "Root canal treatment, crowns, and wisdom tooth removal. An examination and usually an X-ray come first. The clinic provides an estimate and treatment plan before proceeding.": "Rawatan saluran akar, mahkota dan penyingkiran gigi bongsu. Pemeriksaan dan biasanya X-ray didahulukan. Klinik memberikan anggaran dan pelan rawatan sebelum meneruskan.",
    "Examination and X-ray before a treatment plan.": "Pemeriksaan dan X-ray sebelum pelan rawatan.",
    "Eat before your visit unless the dentist advises otherwise. Bring previous X-rays if you have them.": "Makan sebelum datang melainkan doktor gigi menasihatkan sebaliknya. Bawa X-ray terdahulu jika ada.",
    "When is the clinic open?": "Bilakah klinik dibuka?",
    "Monday to Wednesday 12 PM–11 PM, Thursday 2 PM–11 PM, Friday to Sunday 10 AM–11 PM. The last appointment is 10:30 PM.": "Isnin hingga Rabu 12 tengah hari–11 malam, Khamis 2 petang–11 malam, Jumaat hingga Ahad 10 pagi–11 malam. Temujanji terakhir 10:30 malam.",
    "Where is the clinic?": "Di manakah klinik ini?",
    "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor. About 2.6 km from the Woodlands CIQ.": "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor. Kira-kira 2.6 km dari CIQ Woodlands.",
    "Do I need an appointment?": "Adakah saya perlu membuat temujanji?",
    "Walk-in patients are accepted subject to the queue. Evening walk-ins can be busy, so booking a slot online is the safer option if you want a specific time.": "Pesakit walk-in diterima tertakluk kepada giliran. Walk-in petang boleh sesak, jadi menempah slot dalam talian ialah pilihan lebih selamat jika anda mahukan masa tertentu.",
    "What is the RM 30 deposit for?": "Untuk apa deposit RM 30?",
    "It holds your slot and is deducted from your treatment bill. It is not an extra consultation fee. The clinic will confirm payment and rescheduling on WhatsApp.": "Ia memegang slot anda dan ditolak daripada bil rawatan. Ia bukan yuran perundingan tambahan. Klinik akan mengesahkan pembayaran dan penjadualan semula di WhatsApp.",
    "How much does scaling cost?": "Berapakah kos pembersihan skala?",
    "Ultrasonic scaling, polishing and a checkup are typically RM 80–150 depending on tartar buildup. The clinic confirms the amount after examination.": "Pembersihan skala ultrasonik, penggilapan dan pemeriksaan biasanya RM 80–150 bergantung pada pembentukan tartar. Klinik mengesahkan jumlah selepas pemeriksaan.",
    "How much do root canal, crowns or wisdom tooth removal cost?": "Berapakah kos rawatan saluran akar, mahkota atau penyingkiran gigi bongsu?",
    "These procedures are quoted after examination and, where needed, an X-ray. The clinic provides an estimate before treatment starts.": "Prosedur ini disebut harga selepas pemeriksaan dan, jika perlu, X-ray. Klinik memberikan anggaran sebelum rawatan bermula.",

    # Doctors page.
    "Our dentists": "Doktor kami",
    "A team you can meet before the treatment plan.": "Pasukan yang boleh anda kenali sebelum pelan rawatan.",
    "The clinic sees patients seven days a week, including evening appointments. Ask the front desk which dentist is on duty for your slot. Team photos and full profiles will be replaced once the clinic supplies them.": "Klinik menerima pesakit tujuh hari seminggu, termasuk temujanji petang. Tanya kaunter hadapan doktor mana yang bertugas untuk slot anda. Foto pasukan dan profil penuh akan diganti apabila klinik menyediakannya.",
    "General dental care and examinations. Profile and credentials to be confirmed by the clinic.": "Penjagaan dan pemeriksaan pergigian am. Profil dan kelayakan menunggu pengesahan klinik.",
    "General dental care and patient follow-up. Profile and credentials to be confirmed by the clinic.": "Penjagaan pergigian am dan susulan pesakit. Profil dan kelayakan menunggu pengesahan klinik.",
    "Evening appointments and general dental care. Profile and credentials to be confirmed by the clinic.": "Temujanji petang dan penjagaan pergigian am. Profil dan kelayakan menunggu pengesahan klinik.",
    "Weekend appointments and general dental care. Profile and credentials to be confirmed by the clinic.": "Temujanji hujung minggu dan penjagaan pergigian am. Profil dan kelayakan menunggu pengesahan klinik.",

    # Settings and labels that are not part of page content.
    "Klinik Pergigian Setapak": "Klinik Pergigian Setapak",
    "Dental services": "Perkhidmatan pergigian",
    "Service": "Perkhidmatan",
    "Book a slot": "Tempah slot",
    "Dentist": "Doktor gigi",
    "Slot deposit": "Deposit slot",
    "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor": "61, Jalan Perisai, Taman Sri Tebrau, 80500 Johor Bahru, Johor",
    "Mon–Wed: 12 PM – 11 PM · Thu: 2 PM – 11 PM · Fri–Sun: 10 AM – 11 PM": "Isnin–Rabu: 12 tengah hari – 11 malam · Khamis: 2 petang – 11 malam · Jumaat–Ahad: 10 pagi – 11 malam",
    "I agree to be contacted about this request and have read the": "Saya bersetuju untuk dihubungi berkenaan permintaan ini dan telah membaca",
}


def with_ms(value: Any) -> Any:
    """Return a copy of serialised CMS data with a Malay string for every i18n pair."""
    if isinstance(value, dict):
        if isinstance(value.get("en"), str) and any(
            key in value for key in ("en", "zh", "ms")
        ):
            result = dict(value)
            if not result.get("ms"):
                result["ms"] = MS_CONTENT.get(value["en"], value["en"])
            return result
        return {key: with_ms(item) for key, item in value.items()}
    if isinstance(value, list):
        return [with_ms(item) for item in value]
    return value
