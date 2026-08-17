# PERTANYAAN-UNTUK-KLIEN.md — daftar siap kirim (per 17 Agu 2026)

> Irisan 10 Item 3. Dikelompokkan per penerima supaya tinggal di-forward.
> Sumber lengkap + status: `docs/OPEN-QUESTIONS.md`.
> Setelah dijawab: pindahkan jawabannya ke OPEN-QUESTIONS/DOMAIN-RULES,
> lalu coret dari daftar ini.

## 1. KE BU NIKEN — Pajak (paling penting duluan)

1. **Q69** — Selisih invoice susulan (contoh: kekurangan Rp 1 juta yang
   ditagih bulan berikutnya dengan nomor sama): kena PPN/PPh 23 lagi atau
   tidak? Default sistem saat ini: kena, dihitung sebagai transaksi pajak
   baru yang berdiri sendiri. Ini penentu Slice 6 dianggap selesai.
2. **Q14** — Mekanisme PPh 23 yang ISLI potong saat membayar vendor
   bagaimana? Siapa yang membuat bukti potongnya?
3. **Q13** — PPN selalu 1,1%? Apakah ada jasa yang kena 11% penuh atau 0%?
4. **Q76** — Dari 43 kode biaya (daftar terlampir `fixtures/charge-codes.csv`),
   mana saja yang FIXED — pasti muncul di setiap job?
5. **Q64** — Mana kode biaya yang BOLEH tanpa vendor? Dugaan kami: MATERAI,
   HANDLING OPS, ADMINISTRASI. Benar?
6. **Q65** — Selain vendor, field buying apa lagi yang wajib diisi?
   Nomor container? Tanggal? Termin?
7. **Q79** — Format berita acara pengajuan buka gembok biaya: bebas
   (foto/PDF apa saja) atau ada template baku?

## 2. KE BU NIKEN — Laporan & data

8. **Q68** — Laporan memakai tanggal apa sebagai dasar periode: ETD, tanggal
   job dibuat, atau tanggal invoice? Menentukan apakah angka sistem cocok
   dengan rekap yang Ibu pegang sekarang.
9. **Q66** — Setuju rute dinormalisasi menjadi master pelabuhan asal +
   tujuan (supaya peringkat tidak pecah karena salah ketik)?
10. **Q42** — Kenapa hanya April yang tertaut ke summary? Tautannya putus,
    atau memang tidak pernah dibuat?
11. **Q46** — Pembayaran kapal di Sheet1 tidak cocok dengan tabel di atasnya
    (SELILI BARU beda 1.837.000; PULAU LAYANG beda 6.455.000; UMBUL MAS
    tidak muncul). Mana yang benar?
12. **Q44** — Kenapa ada "PENGEMBALIAN KE RATINDO Rp 70.000.000" dari kas
    dropping, padahal Ratindo terdaftar sebagai customer?

## 3. KE FAIROL — Data & orang

13. **Q41 (BLOCKER #1)** — Mohon seluruh berkas `SO BULAN *.xlsx` di folder
    `D:\ISLI\SO 2026\` — sumber costing per job yang sebenarnya; migrasi
    data historis tidak mungkin akurat tanpa ini.
14. **Q67** — Kode sales 3 huruf (KIM, VIN, RIK, YUD) itu siapa saja?
    Apakah mereka pengguna sistem?
15. **Q35** — Siapa "Mundofir 01" (editor terakhir kedua invoice di
    metadata berkas)? Calon pengguna sistem?
16. **Q38** — "Cecilia Niken" dan "Niken Integra": orang yang sama dengan
    dua akun, atau dua orang berbeda?
17. **Q47** — KM LINTAS MAHAKAM dan KM ORIENTAL EMERALD muncul di realisasi
    tapi tidak di daftar — milik job mana?
18. **Q40** — Menyiapkan satu invoice memang butuh berjam-jam (metadata
    menunjukkan 349 menit untuk invoice Materee)? Bagian mana yang paling
    makan waktu?
19. **Q25** — Normalisasi nama: MATEREE / MATEREE NUSANTARA / PT. MATEREE
    NUSANTARA UTAMA satu badan hukum yang sama? METTA LINTAS vs META LINTAS?

## 4. KE PAK INDRA — Akses & keputusan operasional

20. **Q77** — Approval addendum invoice VENDOR: sama seperti customer
    (Manager/Owner, tidak boleh si pembuat), atau cukup orang yang biasa
    menyetujui pembayaran vendor?
21. **Q78** — Siapa yang boleh menyetujui invoice terbit sebelum POD
    (jalur khusus R9.4b)? Sama dengan approval final job, atau boleh
    Manager Finance?
22. **Q50** — Ada 4 akun tapi 5 nama (Pak Indra, Bu Niken, Fairul Ikhsan,
    Mundofir 01, Lana). Mohon nama lengkap + email + peran untuk tiap
    orang — dibutuhkan sebelum go-live.
23. **Q17/Q18/Q57** — Siapa saja pengganti sah approval final saat Pak
    Indra tidak bersedia/cuti? Kalau tidak ada pengganti, job menunggu —
    perlu disadari sebagai keputusan, bukan kecelakaan.
24. **Q16** — Job yang dibatalkan: nomornya hangus atau dipakai ulang?
    Boleh ada gap di urutan?
25. **Q21** — Perlu fitur upload lampiran (scan POD, invoice vendor, BL)?
26. **Q43/Q45** — Kas dropping Pak Teguh (Sheet1 tersembunyi) masuk scope
    sistem atau tidak? Perlu memisahkan biaya perusahaan dari biaya job?
27. **Q61** — Prosedur resmi saat sistem mati di jam kerja? (tanpa
    prosedur, orang kembali ke Excel dan data tidak masuk kembali)
28. **Q62** — 2FA untuk akun Pak Indra (akun yang bisa membuka job
    terkunci dan approval final)?
29. **Q59** — ISLI sudah pakai Google Workspace? Kalau ya, login SSO lebih
    aman tanpa mengelola kata sandi sendiri.

## Tidak mendesak (tidak perlu dikirim duluan)

Q15 (sumber kurs), Q22 (migrasi historis ya/tidak), Q27, Q28, Q29–Q34,
Q55 (Accurate), Q60 (lokasi data — untuk konsultan pajak ISLI).

## Yang baru saja ditutup formal (17 Agu 2026 — untuk info, bukan ditanya lagi)

Q20, Q23, Q24, Q37, Q39, Q56, Q58, Q70, Q71 — jawabannya sudah tertulis di
`docs/OPEN-QUESTIONS.md` dari sesi klien 13–17 Agu 2026; baris lamanya
baru ditutup administratif hari ini.