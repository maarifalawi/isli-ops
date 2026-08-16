# OPEN-QUESTIONS.md

> **Living document.** Agent: kalau kamu menemukan hal yang tidak jelas,
> tambahkan di sini dan **berhenti**. Jangan mengisi jawaban dengan tebakan.
>
> Legenda status: `🔴 BLOCKER` · `🟡 PENTING` · `🟢 BISA MENYUSUL`
> Legenda tujuan: `[NIKEN]` `[FAIROL]` `[INDRA]` `[ALAWI]`

---

## 🔴 BLOCKER — pembangunan tidak boleh dimulai

| # | Pertanyaan | Ke | Ref | Jawaban |
|---|---|---|---|---|
| Q01 | ~~**gsoft itu aplikasi apa?**~~ | — | R13 | ✅ **TERTUTUP 13 Agu 2026.** Sistem di perusahaan Pak Indra sebelumnya. Tidak ada kaitan dengan ISLI. Proyek ini greenfield. |
| Q02 | ~~Format nomor `SEVFJK25040002`~~ | — | R13 | ✅ **TERTUTUP.** Nomor milik sistem lama. Tidak perlu didukung. |
| Q03 | ~~Cut-off Mei vs April~~ | — | R13 | ✅ **TERTUTUP.** Catatan sisa dari sistem lama. Aturan periode ISLI tetap P-INV-3. |
| Q04 | ⚠️ **PPh 23:** kenapa Diametral dipotong 2% tapi Materee tidak? Apa aturannya? | NIKEN | R3.5 | ✅ **Turun dari blocker 13 Agu 2026** -- klien konfirmasi sistem TIDAK perlu tahu aturan hukumnya untuk berjalan. Sudah dirancang sebagai kolom `pph23_applicable` yang dicentang manual per invoice/job oleh tim ISLI sendiri, bukan dihitung otomatis oleh sistem. Alasan legal di baliknya masih bagus untuk diketahui (supaya user tidak lupa centang), tapi bukan lagi pemblokir pembangunan. |
| Q05 | ~~**Pembulatan pajak**~~ | — | R3.6 | ✅ **DIJAWAB 13 Agu 2026.** Bulatkan ke atas (ceiling) kalau memungkinkan. |
| Q06 | ~~**Pemindahan biaya antar job** ("dipecah")~~ | — | R5.3, ADR-0006 | ✅ **DIPUTUSKAN 13 Agu 2026 — Opsi B.** Boleh, dengan approval manajer + alasan tertulis wajib + jejak audit penuh (tabel `cost_reallocations`). GP asli dan GP setelah realokasi ditampilkan berdampingan. |
| Q07 | ~~**Jatuh tempo dihitung dari tanggal apa?**~~ | — | R9.2 | ✅ **DIJAWAB 13 Agu 2026.** Tidak ada rumus otomatis — tanggal jatuh tempo ditentukan manual oleh tim ISLI sendiri saat invoice dibuat. |
| Q08 | ~~Jatuh tempo pakai hari kalender atau hari kerja?~~ | — | R9.3 | ✅ **DIJAWAB 13 Agu 2026.** Tidak relevan — karena Q07 sudah manual, tidak ada hitungan hari yang perlu dibangun. |
| Q09 | ~~**Rumus NETT** memasukkan PPN ke margin.~~ | — | R4.2, ADR-0007 | ✅ **DIJAWAB 13 Agu 2026.** Disengaja — GP dan NETT memang dua metrik berbeda tujuan, keduanya tetap dihitung dan ditampilkan terpisah. Sisa ADR-0007 (asimetri reimburse) masih terbuka. |
| Q10 | ~~Job `ISLI-26.08-005` punya dua versi costing.~~ | — | §1.8 | ✅ **DIPUTUSKAN 13 Agu 2026** (klien serahkan ke agent). **Versi tercetak (biaya 34.535.000, GP 3.465.000/9,12%) yang benar** — itu yang sudah benar-benar ditagihkan ke customer (`CHARGE TRUCKING 2.500.000` sungguh terjadi), sementara Excel cuma lupa diperbarui. Versi Excel dianggap catatan usang. |
| Q11 | ~~Counter job DOM/EXP/IMP memang terpisah? Reset bulanan atau tahunan?~~ | — | R1.2, R1.3 | ✅ **DIJAWAB 13 Agu 2026.** Reset bulanan, per scope (DOM/EXP/IMP terpisah). |
| Q12 | ~~Counter invoice INVDOM/INVEXP terpisah? Reset kapan? Ada INVIMP?~~ | — | R2.3, R2.4 | ✅ **DIJAWAB 13 Agu 2026.** Sama seperti nomor job: reset bulanan, per tipe, dan ya ada `INVIMP`. |

---

## 🟡 PENTING — bisa dikerjakan paralel dengan discovery

| # | Pertanyaan | Ke | Ref | Jawaban |
|---|---|---|---|---|
| Q13 | PPN selalu 1,1%? Ada jasa yang kena 11% penuh atau 0%? | NIKEN | R3.8 | |
| Q14 | Mekanisme PPh 23 yang ISLI potong ke vendor bagaimana? Siapa yang buat bukti potong? | NIKEN | R3.7 | |
| Q15 | Kurs USD ditetapkan siapa dan dari sumber mana? Kurs pajak, BI, atau kesepakatan? | NIKEN | R8.3 | |
| Q16 | Kalau job dibatalkan, nomornya hangus atau dipakai ulang? Boleh ada gap? | FAIROL | R1.4 | |
| Q17 | Daftar lengkap role & siapa saja orangnya? (sales, ops, finance/AP, manajer, owner) | INDRA | RBAC | |
| Q18 | Siapa yang berhak menyetujui unlock dokumen final selain Pak Indra? | INDRA | R6.4 | |
| Q19 | Job non-shipment (penagihan storage murni, GP 0) itu kategori resmi? | NIKEN | R11 | |
| Q20 | NPWP, alamat lengkap, telepon, email, website ISLI untuk kop invoice? | NIKEN | R12 | |
| Q21 | Perlu upload lampiran (scan POD, invoice vendor, BL) ke sistem? | INDRA | — | |
| Q22 | Data historis Apr–Jul 2026 wajib dimigrasi, atau mulai bersih? | INDRA | — | |
| Q23 | Daftar customer + NPWP + TOP default + apakah pemotong PPh 23? | NIKEN | fixtures | |
| Q24 | Daftar vendor + NPWP + termin bayar (cash/tempo berapa hari)? | NIKEN | fixtures | |
| Q25 | Normalisasi nama: `MATEREE` / `MATEREE NUSANTARA` / `PT. MATEREE NUSANTARA UTAMA` sama? `METTA LINTAS` vs `META LINTAS`? | FAIROL | §1.10 | |
| Q26 | ~~Kombinasi leg domestik "mostly" 1+2+3~~ | — | R10 | ✅ **TERTUTUP 13 Agu 2026.** Default `1+2+3`, boleh diubah dengan alasan tercatat. Pengecualian akan terbaca sendiri dari `leg_override_alasan` setelah 3 bulan. |
| Q27 | Approval Pak Indra dilakukan dari mana? Perlu akses HP? | INDRA | NFR | |
| Q28 | Berapa target volume job per bulan 3 tahun ke depan? | INDRA | NFR | |

---

## 🟢 BISA MENYUSUL

| # | Pertanyaan | Ke | Jawaban |
|---|---|---|---|
| Q29 | Hosting: server kantor, VPS, atau cloud? Ada IT internal? | INDRA, ALAWI | |
| Q30 | Peran Pak Teguh dalam alur kas (dropping 200 juta)? | NIKEN | |
| Q31 | Sistem keuangan tujuan integrasi Phase 3 sudah pasti Accurate? | INDRA | |
| Q32 | Perlu notifikasi (email/WA) saat butuh approval atau invoice jatuh tempo? | INDRA | |
| Q33 | Perlu multi-cabang / multi-entitas? | INDRA | |
| Q34 | Retensi data & kebijakan backup? | INDRA | |

---

## Catatan cara memakai dokumen ini

1. Bawa tabel 🔴 ke sesi discovery. Jangan pulang sebelum semuanya terisi.
2. Setiap jawaban yang masuk → pindahkan aturannya ke `DOMAIN-RULES.md`
   dan ubah statusnya jadi ✅ TERBUKTI, sertakan sumber jawabannya.
3. Kalau jawaban mengubah keputusan arsitektur → buat ADR baru, jangan edit
   ADR lama (ADR bersifat append-only).

---

## 🔎 Tambahan dari audit metadata berkas — 13 Agu 2026

Ditemukan dengan membaca `docProps/core.xml` tiap berkas, bukan dari isinya.
Lihat `docs/SOURCE-PROVENANCE.md`.

| # | Pertanyaan | Ke | Ref | Jawaban |
|---|---|---|---|---|
| Q35 | **Siapa "Mundofir 01"?** Orang ini yang terakhir mengedit kedua invoice (Materee 349 menit, Diametral 1 menit) tapi tidak pernah disebut di meeting. Apa perannya? Dia calon pengguna sistem? | FAIROL, INDRA | RBAC, Q17 | |
| Q36 | **"VFL INDONESIA" itu apa?** | NIKEN | Q01 | 🟡 **Hampir tertutup.** Konsisten dengan jawaban Q01: template warisan dari tempat kerja lama Pak Indra. Sisa yang perlu dipastikan: tidak ada baris data VFL yang terbawa ke rekap ISLI. |
| Q37 | 🔴 **Apakah ada baris/kolom yang dihapus dari summary report sebelum dikirim?** File disimpan ulang Bu Niken 12 Agu 09:10, tepat sebelum serah-terima. Menentukan apakah TEMUAN 1 & 2 valid. | NIKEN | RECONCILIATION | |
| Q38 | "Cecilia Niken" dan "Niken Integra" — orang yang sama dengan dua akun, atau dua orang berbeda? | FAIROL | — | |
| Q39 | Apakah 75 job yang kami terima itu seluruh job Apr–Jul 2026, atau hanya sebagian yang dipilih sebagai contoh? | FAIROL | fixtures | |
| Q40 | Invoice Materee butuh 349 menit waktu edit. Apakah menyiapkan satu invoice memang selama itu? Kalau ya, bagian mana yang paling makan waktu? | FAIROL, NIKEN | PRD | |

> Q40 bukan pertanyaan iseng. Kalau satu invoice memang butuh berjam-jam,
> itu angka penghematan paling konkret yang bisa dibawa ke Pak Indra — dan
> jadi ukuran keberhasilan Phase 1 yang bisa diverifikasi setelah go-live.

---

## ✅ Q37 SUDAH DIJAWAB — 13 Agu 2026

> **Q37:** Apakah ada baris/kolom yang dihapus dari summary report sebelum
> dikirim?
>
> **Jawaban klien:** Tidak ada yang dihapus.
>
> **Verifikasi teknis:** Sheet `EXIM` tidak punya baris tersembunyi maupun
> bekas penghapusan. Rumus `SUM(O39:O48)`, `SUM(P39:P48)`, `SUM(Q39:Q48)` di
> baris 50 konsisten satu sama lain. Kalau ada penghapusan, ketiganya bergeser
> bersamaan.
>
> **Akibat:** Golden test Tingkat B **diaktifkan**. Angka Rp 22.500.000
> terverifikasi dan boleh dipakai.

---

## 🔎 Tambahan dari verifikasi struktur berkas — 13 Agu 2026

| # | Pertanyaan | Ke | Ref | Jawaban |
|---|---|---|---|---|
| Q41 | 🔴 **Minta seluruh berkas `SO BULAN *.xlsx` di folder `D:\ISLI\SO 2026\`.** Summary hanya tertaut ke `SO BULAN APRIL 2026.xlsx` (12 sheet, satu per job). Itu sumber costing per job yang sebenarnya dan kita belum punya. | FAIROL | TEMUAN 6 | |

> ✅ **Diklarifikasi 13 Agu 2026:** ini BUKAN blocker untuk mulai membangun sistem.
> Migrasi data historis adalah Slice 9 tersendiri, terpisah dari pembangunan
> sistem inti (Slice 0-8). Berkas `SO BULAN *.xlsx` boleh menyusul kapan saja --
> termasuk setelah web-nya sudah jadi -- karena Slice 9 memang dirancang untuk
> dikerjakan belakangan. Yang jadi TIDAK bisa disusulkan cuma: laporan/rekap
> yang butuh data historis akurat (Slice 8) akan tetap kosong/tidak lengkap
> sampai berkas ini masuk dan diimpor.
| Q42 | Kenapa hanya April yang tertaut? Mei–Juli diketik manual. Tautannya putus, atau memang tidak pernah dibuat? | NIKEN | TEMUAN 6 | |
| Q43 | 🔴 **Sheet tersembunyi `Sheet1` berisi kas** — dropping Rp 200 juta dari Pak Teguh, pemakaian Rp 210,1 juta (lebih pakai Rp 10,1 juta). Ini masuk scope sistem atau tidak? Kalau ya, fase berapa? | INDRA | TEMUAN 7 | |
| Q44 | "PENGEMBALIAN KE RATINDO Rp 70.000.000" — Ratindo terdaftar sebagai customer. Kenapa ada pengembalian uang ke customer dari kas dropping? | NIKEN | TEMUAN 7 | |
| Q45 | Cicilan mobil (Rp 6 juta) dan petty cash (Rp 5 juta) dibayar dari kas operasional yang sama. Sistem perlu memisahkan biaya operasional job dari biaya perusahaan? | INDRA | TEMUAN 7 | |
| Q46 | Pembayaran kapal di `Sheet1` tidak cocok dengan tabel di atasnya (SELILI BARU beda 1.837.000; PULAU LAYANG beda 6.455.000; UMBUL MAS tidak muncul). Mana yang benar? | NIKEN | TEMUAN 7 | |
| Q47 | KM LINTAS MAHAKAM dan KM ORIENTAL EMERALD muncul di realisasi tapi tidak di daftar. Job mana? | FAIROL | TEMUAN 7 | |
| Q48 | ~~Nomor `SEVFJK25040002`~~ | — | Q01, Q02 | ✅ **TERTUTUP.** Ya, nomor sistem lama. Di luar lingkup. |

> **Q41 (`SO BULAN *.xlsx`) sekarang adalah blocker nomor satu**, karena Q01 sudah tertutup 13 Agu 2026.
> Tanpa berkas `SO BULAN *.xlsx`, migrasi data historis tidak mungkin akurat,
> dan kita tidak punya contoh costing per job yang lengkap untuk semua bulan.

---

# Sesi 13 Agustus 2026 — pemutakhiran

## Ditutup oleh jawaban klien

| # | Pertanyaan | Jawaban | Jadi apa |
|---|---|---|---|
| Q09 | Definisi GP vs NETT | Terjawab dari **rumus**: `GP = selling sebelum pajak − cost`, `NETT = selling setelah pajak − cost` | ADR-0007 siap `Accepted` |
| Q20 | NPWP ISLI | Diinput user | field di pengaturan |
| Q23 | Master customer | Diinput user | CRUD |
| Q24 | Master vendor | Diinput user | CRUD |
| Q37 | Baris terhapus? | Tidak ada | ✅ |
| Q39 | Kelengkapan 75 job | Tidak tentu, tidak dihitung | rancang 100/bln |

## Q41–Q48 — masih terbuka

Lihat catatan sebelumnya. **Q41** (berkas `SO BULAN *.xlsx`) tetap yang paling
penting setelah Q01.

---

## Pertanyaan baru

### Q49 ✅ DIJAWAB 13 Agu 2026 — Mata uang: rupiah saja, atau ada USD?

**JAWABAN: mata uang sistem adalah Rupiah.** Ini tidak membatalkan R8
(konversi USD per job) — job EXIM tetap boleh dikutip dalam USD dan
dikonversi ke IDR dengan kurs per job (`usd_amount` + `kurs_idr`), tapi semua
angka yang disimpan, dilaporkan, dan dijadikan dasar pajak/invoice adalah IDR.
Tidak ada laporan atau saldo dalam USD.

**Masih menunggu:** kurs diambil dari mana — BI, bank, atau kesepakatan
dengan customer per job? (belum ditanyakan ulang, tetap terbuka sebagai
sub-pertanyaan teknis, prioritas rendah karena tidak mengubah desain skema.)

### Q50 ⚠️ — 4 akun, tapi 5 nama

Yang muncul: Pak Indra, Bu Niken, Fairul Ikhsan, Mundofir 01, Lana.
Siapa yang tidak dapat akun, atau nama mana yang orang yang sama?

**Butuh:** nama lengkap, email, peran, untuk 4 orang.

### Q51 ✅ DIJAWAB 13 Agu 2026 — Hosting atas nama siapa?

**JAWABAN: Pak Indra bayar sendiri ("pake uang gua").** Ini menjawab Q51 dan
Q53 sekaligus — tidak perlu proses pemindahan akun saat serah terima kalau
akun sejak awal dibuat atas nama/kartu Pak Indra, dengan Alawi diundang
sebagai kolaborator (bukan pemilik akun).

### Q52 ✅ DIJAWAB 13 Agu 2026 — Siapa pegang akses database produksi setelah serah terima?

**JAWABAN: pihak ISLI sendiri ("mereka") yang pegang akses setelah serah
terima**, bukan Alawi. Konsekuensi: kredensial database produksi (Supabase)
harus diserahkan penuh ke tim ISLI di akhir proyek — perlu langkah serah
terima kredensial yang eksplisit, bukan cuma "sistem selesai, dipakai saja".

### Q53 ✅ DIJAWAB 13 Agu 2026 — Siapa bayar langganan bulanan?

**JAWABAN: Pak Indra sendiri** (lihat Q51 — satu jawaban untuk keduanya).
Perkiraan biaya Vercel + Supabase + domain ≈ Rp 400rb–800rb/bulan tetap jadi
catatan supaya tidak mati mendadak karena kartu kredit kedaluwarsa.

### Q54 ✅ DIJAWAB 13 Agu 2026 — Masa garansi setelah serah terima?

**JAWABAN: 6 bulan** (bukan usulan 60 hari) untuk perbaikan bug tanpa biaya,
di luar permintaan fitur baru.

### Q55 ⚠️ — Detail Accurate Online

API-nya ada dan resmi. Yang belum diketahui: paket langganan, pemegang akun
developer, arah sinkronisasi (satu arah ke Accurate atau dua arah), dan objek
apa yang dikirim (Sales Invoice / Purchase Invoice / Journal).

### Q56 ⚠️ — Kalau MANAGER yang bikin job, siapa approval 1?

OWNER merangkap, atau approval 1 dilewati?

### Q57 ⚠️ — Pak Indra cuti, siapa approval final?

Benar-benar tidak ada pengganti? Kalau ya, job menunggu — dan itu harus
disadari sebagai keputusan, bukan kecelakaan.

### Q58 ⚠️ — Staf boleh lihat GP?

Rancangan sekarang: tidak. Perlu dikonfirmasi — karena kalau staf yang input
biaya tidak bisa lihat margin, mereka juga tidak bisa menangkap kesalahan.

### Q59 🟡 — Login pakai Google Workspace?

Kalau ISLI sudah pakai Google Workspace, SSO lebih aman dan tidak perlu
mengelola kata sandi.

### Q60 ⚠️ — "Data disimpan di Indonesia" — seketat apa?

UU KUP Pasal 28 ayat (11) mewajibkan penyimpanan **di Indonesia**. Supabase
region terdekat Singapura.

**Ini pertanyaan untuk konsultan pajak ISLI, bukan untuk developer.** Kalau
ditafsirkan ketat, pilihan hosting berubah.

### Q61 🔴 — Prosedur saat sistem mati di jam kerja

Belum pernah dibahas. Kalau tidak ada prosedur, orang kembali ke Excel dan
datanya tidak pernah masuk kembali.

### Q62 🟡 — 2FA untuk akun Pak Indra?

Akun yang bisa membuka job terkunci dan menyetujui final sebaiknya dilindungi
lebih dari sekadar kata sandi.

### Q63 ✅ DIJAWAB 13 Agu 2026 — Kenapa proyek sistem sebelumnya gagal?

**JAWABAN: itu bukan proyek yang gagal.** Klien mengoreksi: sistem yang
dulu dibangun bersama pengembang dari India itu untuk **kantor/perusahaan
yang berbeda** dari ISLI, bukan proyek ISLI yang gagal. Cerita di transkrip
awal ("saya pernah dulu develop satu sistem sama orang India") adalah
pengalaman masa lalu Pak Indra di perusahaan lain, dipakai sebagai analogi
cara diskusi requirement ("tambah lagi, tambah lagi" / scope creep) — bukan
riwayat proyek ISLI. **Tidak ada proyek ISLI sebelumnya yang gagal.**

Yang perlu digali:
- Sampai mana yang sempat jadi?
- Berapa lama berjalan sebelum berhenti?
- Bagian mana yang paling banyak berubah di tengah jalan?
- Apa yang membuat Pak Indra akhirnya berhenti?
- Apa yang Bu Niken rasa paling melelahkan?
- Ada kodenya yang tersisa?

Orang yang sama masih terlibat. Kalau penyebabnya tidak diketahui, peluang
terulang tinggi.


---

# Putaran 5 — pertanyaan baru dari kebutuhan 13 Agu 2026

| # | Pertanyaan | Ke | Ref | Status |
|---|---|---|---|---|
| Q64 | 🔴 **Dari 43 kode biaya, mana yang BOLEH tanpa vendor?** Dugaan kami: `MATERAI`, `HANDLING OPS`, `ADMINISTRASI`. Sisanya wajib. Benar? | NIKEN | R15.3 | menunggu |
| Q65 | ⚠️ Selain vendor, field buying apa lagi yang wajib menurut Bu Niken? Nomor container? Tanggal? Termin? | NIKEN | R15.2 | menunggu |
| Q66 | ⚠️ Peringkat berdasarkan **rute** — rute disimpan sebagai teks bebas (`JKT-BTM`, `PRW-PALU`). Perlu dinormalisasi jadi master pelabuhan asal + tujuan supaya peringkatnya tidak pecah karena salah ketik. Setuju? | NIKEN, FAIROL | R14.2 | menunggu |
| Q67 | ⚠️ Peringkat **sales** — sekarang hanya ada kode 3 huruf (`KIM`, `VIN`, `RIK`, `YUD`). Siapa saja orangnya, dan apakah mereka pengguna sistem? | FAIROL | R14.2, Q50 | menunggu |
| Q68 | ⚠️ Laporan pakai tanggal apa sebagai dasar periode — **ETD**, tanggal job dibuat, atau tanggal invoice? Ketiganya bisa beda bulan. Ini menentukan apakah angka laporan cocok dengan rekap Bu Niken. | NIKEN | R14.1 | menunggu |

> **Q68 adalah yang paling menentukan.** Kalau salah pilih, seluruh angka
> laporan akan berbeda dari rekap yang Bu Niken pegang sekarang, dan sistem akan
> dianggap salah padahal cuma beda definisi periode.


---

# Putaran 6 — invoice susulan/koreksi (R16), 13 Agu 2026

| # | Pertanyaan | Ke | Ref | Status |
|---|---|---|---|---|
| Q69 | 🔴 Selisih invoice susulan (contoh: kekurangan Rp 1 juta) — **kena PPN/PPh lagi atau tidak?** Default sistem saat ini: kena, dihitung sebagai transaksi pajak baru dan berdiri sendiri. | NIKEN | R16.3 | menunggu — **blocker sebelum Slice 6 invoice selesai** |
| Q70 | ⚠️ Addendum butuh persetujuan siapa sebelum berlaku — Manager saja, atau harus sampai Owner seperti job? | INDRA | R16.5 | menunggu |
| Q71 | ⚠️ Label pembeda ("SUSULAN-1") ini **terlihat di kertas yang diterima customer**, atau cuma catatan internal ISLI? | NIKEN | R16.6 | menunggu |

> Sambil menunggu jawaban, tabel `customer_invoice_addendum` sudah dibuat di
> skema dengan default yang paling defensif: kena pajak, approval Manager/Owner,
> label terlihat di cetakan. Ketiganya tinggal diubah satu tempat kalau jawabannya lain.

---

# Putaran 7 -- transkrip versi 2, 13 Agu 2026

**Q70 dan Q71 sudah dijawab lewat survei di sesi ini:**
- **Q70 -- JAWABAN: Manager/Owner, tidak boleh sama dengan pembuat** (sudah sesuai default R16.5, tidak ada perubahan skema).
- **Q71 -- JAWABAN: label terlihat di kertas yang diterima customer** (sudah sesuai default R16.6, tidak ada perubahan skema).

**Temuan baru dari transkrip 2 dan keputusan yang sudah diambil (survei sesi ini):**

| # | Pertanyaan | Ke | Ref | Status |
|---|---|---|---|---|
| Q72 | ✅ DIPUTUSKAN -- Addendum juga dibuat untuk invoice VENDOR (nomor sama, dipecah antar bulan), sama seperti customer. Tabel `vendor_invoice_addenda` (R17) sudah dibuat. | -- | R17 | selesai |
| Q73 | ✅ DIPUTUSKAN -- Invoice customer boleh terbit sebelum POD kalau ada approval khusus (`issued_before_pod` + `early_issue_approved_by`). Tidak melonggarkan R9.4 secara umum. | -- | R9.4b | selesai |
| Q74 | ✅ DIPUTUSKAN -- Buka gembok biaya (R6.4) wajib unggah dokumen berita acara, bukan cukup catatan. Tabel `cost_reopen_requests` sudah dibuat. | -- | R6.4 | selesai |
| Q75 | ✅ DIPUTUSKAN -- Kode biaya dikategorikan FIXED vs OPSIONAL (`charge_codes.kategori`). Default kode baru: OPSIONAL. | -- | R15.5 | selesai |
| Q76 | 🔴 **Dari 43 kode biaya, mana saja yang FIXED?** Kami tahu contohnya (Ocean Freight, BL, THC, LSS, trucking, dooring, segel) tapi belum tahu daftar lengkapnya. Sampai dijawab, semua kode baru default `OPSIONAL`. | NIKEN | R15.5 | menunggu |
| Q77 | ⚠️ Approval addendum VENDOR (R17.5) -- apakah levelnya sama seperti addendum customer (Manager/Owner, ≠ pembuat), atau vendor punya alur approval sendiri (misalnya cukup yang biasa approve pembayaran vendor)? | INDRA | R17.5 | menunggu |
| Q78 | ⚠️ Untuk invoice yang terbit sebelum POD (R9.4b) -- siapa yang berhak approve jalur ini? Sama dengan approval final job (Pak Indra), atau boleh Manager Finance? | INDRA | R9.4b | menunggu |
| Q79 | ⚠️ Berita acara (R6.4) -- format dokumennya bebas (foto/PDF apa saja), atau ada template baku yang harus dipakai? | NIKEN | R6.4 | menunggu |

## app_role / REVOKE masterdata di level database (Irisan 3, tahap 10.5)

- Dicatat: 2026-08-16, Sesi D, tahap 10.5 (langkah 3).
- Hasil pemeriksaan: `grep -r "REVOKE\|app_role" drizzle/*.sql` -> **0 match** (PowerShell: `Select-String -Path drizzle\*.sql -Pattern 'REVOKE','app_role'`, keluaran kosong, exit code 1).
- Artinya: `app_role` **belum ada sama sekali** di skema maupun migrasi (0000, 0001, 0002).
- Sesuai instruksi 10.5 langkah 3: migrasi REVOKE **TIDAK dibuat** sekarang, karena membuat `app_role` berada di luar cakupan asli Irisan 3 (skema dibekukan sejak migrasi 0002).
- **Open question untuk klien / Pak Indra**: apakah `app_role` (role aplikasi di level database, mis. OWNER/MANAGER/STAFF) akan diadakan pada irisan berikutnya, agar REVOKE akses masterdata dari role yang tidak berwenang dapat menyusul sebagai migrasi terpisah (mengikuti .clinerules/06-db-migrations.md: db:generate -> tunjukkan SQL -> persetujuan -> db:migrate)?
- Status sementara: otorisasi mutasi master data dijaga di level aplikasi -- server actions `src/lib/actions/master.ts` via `assertCan(user.role, "master:manage")` (dimiliki OWNER dan MANAGER; STAFF ditolak), dibuktikan oleh skenario "STAFF melihat data master read-only tanpa tombol tambah" di `tests/e2e/master-crud.spec.ts` -- bukan di level database. (Tidak ada role bernama ADMIN di sistem ini; role yang sah hanya OWNER/MANAGER/STAFF.)
- **Status: MENUNGGU** -- jawaban klien / Pak Indra ditunggu; TIDAK ada migrasi baru yang dibuat untuk ini (Irisan 3 ditutup 16 Agu 2026 tanpa REVOKE di level database).

## Q19 — R11 (job non-shipment) vs ck_legs (Irisan 4a)

- Dicatat: 2026-08-16, Sesi Irisan 4a (schema + form buat job + matriks leg).
- Konteks: R11 (`docs/DOMAIN-RULES.md` baris 413-418) bertanda ⚠️ DUGAAN dan
  hanya menyebut "GP boleh 0" untuk penagihan storage/demurrage murni. R11
  TIDAK menyebut apa pun soal leg, dan tidak ada kolom `job_type`/kategori di
  tabel `jobs`.
- Temuan: constraint `ck_legs` (`drizzle/0000_unusual_rockslide.sql` baris
  167-168) mewajibkan **minimal satu leg** (`leg_trucking OR leg_freight OR
  leg_delivery`) untuk SETIAP job. "GP boleh 0" TIDAK bentrok dengan ck_legs
  (skema sudah mendukung selling/pencadangan default 0). Yang berpotensi
  bentrok hanya interpretasi "non-shipment boleh 0 leg" — tapi itu tebakan
  yang belum ada di dokumen.
- **Pertanyaan:** apakah job non-shipment boleh punya 0 leg (yang akan bentrok
  dengan ck_legs yang mewajibkan >=1 leg)? Atau non-shipment tetap punya >=1
  leg dan hanya berbeda pada GP = 0?
- Keputusan sementara (arahan user, Irisan 4a): **JANGAN** melonggarkan
  `ck_legs`. Sampai Q19 dijawab, sistem memperlakukan SEMUA job (termasuk
  non-shipment) tetap **wajib >=1 leg**. Tidak ada migrasi yang mengubah
  `ck_legs`. Form/kode buat job TIDAK mengasumsikan leg=0 diperbolehkan.
- **Status: MENUNGGU** — jawaban Bu Niken ditunggu (ref R11).

