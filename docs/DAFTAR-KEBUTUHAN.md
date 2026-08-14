# Daftar Kebutuhan — apa yang masih kurang sebelum sistem bisa dibangun

> Dokumen ini rangkuman dari `docs/OPEN-QUESTIONS.md` (63 pertanyaan, 57 masih
> terbuka). Bedanya: yang ini disusun menurut **siapa yang harus memberi** dan
> **apa akibatnya kalau tidak ada**, bukan menurut nomor pertanyaan.
>
> Boleh diteruskan apa adanya ke Bu Niken / Fairol / Pak Indra.

---

## Cara membaca

| Tanda | Arti |
|---|---|
| 🛑 | Menghentikan pembangunan. Tidak ada jalan memutar. |
| ⚠️ | Bisa dikerjakan sementara dengan asumsi, tapi asumsinya harus ditulis dan berisiko dibongkar ulang. |
| 🟢 | Bisa menyusul tanpa mengganggu. |

---

# A. BERKAS — yang harus dikirim

### 🛑 A1. Seluruh `SO BULAN *.xlsx` (April, Mei, Juni, Juli 2026)
Ada di `D:\ISLI\SO 2026\`. Satu berkas per bulan, satu sheet per job.
Summary hanya tertaut ke berkas April; Mei–Juli tampaknya diketik manual.

**Tanpa ini:** tidak ada costing per job. Migrasi data historis tidak mungkin
akurat, dan seluruh laporan selain rekap bulanan tidak bisa diisi.
**Dari:** Fairol

### ✅ A2. ~~Tampilan atau export dari gsoft~~ — TIDAK DIBUTUHKAN LAGI
**Dijawab 13 Agu 2026 oleh Pak Indra:** gsoft adalah sistem di perusahaan tempat
ia bekerja **sebelumnya**. Tidak ada hubungan apa pun dengan ISLI.

**Akibatnya:** proyek ini **membangun baru**, bukan menggantikan. Harga dan jadwal
di `PROPOSAL-PHASES.md` tetap berlaku. Jangan minta apa pun soal gsoft.

### ⚠️ A3. Satu contoh **POD** yang sudah ditandatangani
Boleh difoto pakai HP.

**Tanpa ini:** kita tidak tahu POD memuat apa, siapa yang tanda tangan, dan
tanggal mana yang dipakai untuk mulai menghitung jatuh tempo.
**Dari:** Lana / Fairol

### ⚠️ A4. Satu contoh **Sales Order** yang dikirim ke customer
Sebelumnya ditanyakan sebagai "contoh SO". Maksudnya: dokumen yang keluar dari
ISLI ke customer sebelum job berjalan — berisi harga yang disepakati.
Kalau ISLI **tidak** pernah menerbitkan dokumen semacam itu, jawab "tidak ada" —
itu jawaban yang sah dan justru menyederhanakan sistem.

### ⚠️ A5. Satu contoh **invoice impor (INVIMP)**
Kita sudah punya contoh domestik dan ekspor. Impor belum ada satu pun.

**Tanpa ini:** format penomoran invoice impor ditebak. Nomor pajak yang salah
format bisa ditolak.

### 🟢 A6. Satu contoh **bukti potong PPh 23** yang ISLI terbitkan ke vendor

---

# B. ATURAN — yang harus dijawab Bu Niken

Ini bagian paling penting. Semuanya soal **uang dan pajak**, dan tidak satu pun
boleh ditebak.

### 🛑 B1. Kapan PPh 23 dipotong, kapan tidak?
Invoice Diametral dipotong 2%. Invoice Materee tidak. Apa yang membedakan?
Apakah tergantung customer, jenis jasa, atau ada-tidaknya NPWP?

**Tanpa ini:** sistem tidak boleh menebak sendiri. Salah potong = salah lapor pajak.

### 🛑 B2. Aturan pembulatan
Grand total Diametral tertulis **131.429.434**. Hitungan kami **131.429.433**.
Beda Rp 1. Mana yang benar, dan pembulatannya di langkah mana?

**Tanpa ini:** ada satu test yang sengaja dibiarkan gagal di sistem sampai
pertanyaan ini terjawab.

### 🛑 B3. Jatuh tempo dihitung dari tanggal apa?
Di Excel ditemukan **tiga** rumus berbeda. Dari tanggal invoice, tanggal POD,
atau tanggal kirim?

### 🛑 B4. Hari kalender atau hari kerja?
Kalau hari kerja, apakah libur nasional ikut dihitung?

### 🛑 B5. Rumus NETT memasukkan PPN ke dalam margin
Angka NETT selalu terlihat lebih besar dari GP, dan selisihnya persis sebesar PPN.
PPN itu uang negara yang harus disetor, bukan keuntungan ISLI.
Ini disengaja sebagai cara melihat arus kas, atau memang keliru?

### 🛑 B6. Job `ISLI-26.08-005` punya **dua** angka biaya
Di Excel Rp 32.085.000 (GP 15,6%). Di invoice cetak Rp 34.535.000 (GP 9,1%).
Bedanya satu baris `CHARGE TRUCKING Rp 2.500.000`. Mana yang benar?

### 🛑 B7. Penomoran
- Counter job DOM / EXP / IMP terpisah? Reset tiap bulan atau tiap tahun?
- Counter invoice INVDOM / INVEXP terpisah? Ada INVIMP?
- Job dibatalkan — nomornya hangus, atau dipakai ulang?

**Catatan:** di data ada **16 nomor job kembar**. Sistem sudah dirancang
menampungnya, tapi aturan ke depan harus ditetapkan.

### ⚠️ B8. PPN selalu 1,1%?
Ada jasa yang kena 11% penuh atau 0%?

### ⚠️ B9. Kurs USD ditetapkan dari mana?
Kurs pajak, kurs BI, atau kesepakatan dengan customer? Ditetapkan tanggal berapa?

> Catatan: sebelumnya dijawab "rupiah saja", tapi job sheet ekspor memakai
> USD dikali kurs 18.200. Jadi USD tetap ada di sisi input.

### ⚠️ B10. Daftar customer lengkap
Nama resmi, NPWP, termin bayar default, dan apakah mereka memotong PPh 23.

### ⚠️ B11. Daftar vendor lengkap
Nama resmi, NPWP, dan termin bayar — tunai atau tempo berapa hari.

### ⚠️ B12. Penyeragaman nama
`MATEREE` / `MATEREE NUSANTARA` / `PT. MATEREE NUSANTARA UTAMA` — satu perusahaan?
`METTA LINTAS` dan `META LINTAS` — sama atau beda?

---

# C. KEPUTUSAN — yang harus dijawab Pak Indra

### 🛑 C1. Kenapa proyek sistem yang dulu gagal?
Pertanyaan paling penting di seluruh dokumen ini.
Apa yang dijanjikan, sampai mana jalannya, kapan berhenti, dan menurut Bapak
salahnya di mana.

**Tanpa ini:** kita berisiko mengulang jalan yang sama persis.

### 🛑 C2. Data historis April–Juli 2026 dimigrasi atau mulai bersih?
Migrasi berarti pekerjaan tambahan yang cukup besar, dan hasilnya hanya sebaik
berkas sumbernya. Mulai bersih berarti laporan tahun ini terpotong dua.

### 🛑 C3. Pemindahan biaya antar job
Saat ini biaya bisa "dipecah" ke job lain. Sistem harus **melarang**, atau
**mengizinkan tapi tercatat dan butuh persetujuan**?

### 🛑 C4. Prosedur saat sistem mati di jam kerja
Operasional berhenti, atau kembali ke Excel lalu diinput ulang?
Jawabannya menentukan seberapa mahal cadangan yang perlu disiapkan.

### ⚠️ C5. Staf boleh melihat GP?
Saat ini sistem menyembunyikan GP dari staf biasa. Kalau itu keliru, sekarang
waktunya diperbaiki — nanti jauh lebih repot.

### ⚠️ C6. Kalau manajer yang membuat job, siapa persetujuan pertama?
Alurnya maker → persetujuan 1 → persetujuan final. Kalau pembuatnya manajer
sendiri, satu tahap hilang.

### ⚠️ C7. Pak Indra cuti atau di luar negeri — siapa yang menyetujui?
Atau semuanya menunggu?

### ⚠️ C8. Siapa boleh membuka dokumen yang sudah terkunci, selain Bapak?

### ⚠️ C9. Perlu unggah lampiran? (scan POD, invoice vendor, BL)
Ini menambah kebutuhan penyimpanan dan biaya bulanan.

### 🟢 C10. Target volume job per bulan tiga tahun ke depan
Saat ini ±19 job/bulan. Sistem dirancang untuk 100.

---

# D. KAS — temuan dari sheet tersembunyi

Di `DUMMY SUMMARY REPORT.xlsx` ada sheet tersembunyi bernama `Sheet1` berisi
catatan kas. Isinya di luar yang dibahas saat rapat.

### 🛑 D1. Ini masuk lingkup sistem atau tidak?
Dropping Rp 200.000.000 dari Pak Teguh, pemakaian Rp 210.119.411 —
lebih pakai Rp 10.119.411.

### ⚠️ D2. "PENGEMBALIAN KE RATINDO Rp 70.000.000"
Ratindo terdaftar sebagai customer. Kenapa ada pengembalian uang ke customer
dari kas dropping?

### ⚠️ D3. Cicilan mobil Rp 6 juta dan petty cash Rp 5 juta
Dibayar dari kas operasional yang sama. Sistem perlu memisahkan biaya job dari
biaya perusahaan?

### ⚠️ D4. Pembayaran kapal tidak cocok dengan tabel di atasnya
SELILI BARU beda Rp 1.837.000. PULAU LAYANG beda Rp 6.455.000.
UMBUL MAS tidak muncul sama sekali. Mana yang benar?

---

# E. ORANG — yang belum jelas

### ⚠️ E1. Siapa "Mundofir 01"?
Orang ini yang terakhir menyunting kedua invoice contoh, tapi namanya tidak
pernah disebut saat rapat. Dia calon pengguna sistem?

**Ini penting:** disebut ada 4 pengguna, tapi muncul 5 nama.

### ⚠️ E2. "Cecilia Niken" dan "Niken Integra" — satu orang dua akun, atau dua orang?

### ⚠️ E3. "VFL INDONESIA"
Tercatat sebagai pembuat asli berkas summary, Mei 2025.
Perusahaan lain, afiliasi, atau template warisan? Ada hubungannya dengan gsoft?

### ⚠️ E4. Menyiapkan satu invoice butuh berapa lama?
Metadata berkas menunjukkan invoice Materee butuh **349 menit** waktu penyuntingan
aktif. Kalau memang selama itu, itu angka penghematan paling konkret yang bisa
ditunjukkan — sekaligus ukuran keberhasilan yang bisa dibuktikan setelah sistem jalan.

---

# F. AKSES & SERAH TERIMA — belum diputuskan

### 🛑 F1. Langganan atas nama siapa?
Hosting dan database. Atas nama ISLI atau atas nama pengembang?

**Ini penyebab umum sengketa.** Kalau atas nama pengembang, ISLI tidak benar-benar
memiliki sistemnya.

### 🛑 F2. Siapa memegang akses database produksi setelah serah terima?

### 🛑 F3. Siapa membayar langganan bulanan (±Rp 750.000)?

### 🛑 F4. Masa garansi setelah serah terima berapa lama?
Usulan: 60 hari untuk perbaikan bug.

### ⚠️ F5. Detail Accurate
Online atau Desktop? Versi berapa? Langganan paket apa?
Hanya Accurate **Online** yang punya API resmi. Kalau Desktop, penyambungan
otomatis tidak mungkin dan harus lewat ekspor–impor berkas.

### ⚠️ F6. Data wajib disimpan di Indonesia?
Supabase terdekat ada di Singapura. Kalau ada kewajiban data di dalam negeri,
pilihan hostingnya berubah dan biayanya naik.

### 🟢 F7. Login pakai Google Workspace atau email + kata sandi biasa?

### 🟢 F8. Perlu verifikasi dua langkah untuk akun Pak Indra?
Dia yang memberi persetujuan final. Kalau akunnya diambil orang, seluruh rantai
persetujuan tidak ada artinya.

---

# Ringkasan — apa yang benar-benar menghentikan

Dari semua di atas, yang **wajib** ada sebelum pembangunan sungguhan dimulai:

| | Kebutuhan | Dari |
|---|---|---|
| ~~1~~ | ~~gsoft itu apa~~ ✅ tertutup 13 Agu 2026 | — |
| 2 | Berkas `SO BULAN *.xlsx` | Fairol |
| 3 | Aturan PPh 23 | Niken |
| 4 | Aturan pembulatan | Niken |
| 5 | Dasar hitung jatuh tempo | Niken |
| 6 | Mana costing yang benar untuk `26.08-005` | Niken |
| 7 | Aturan penomoran & reset counter | Fairol |
| 8 | Migrasi data historis atau mulai bersih | Indra |
| 9 | Kenapa proyek sebelumnya gagal | Indra |
| 10 | Langganan & akses atas nama siapa | Indra |

**Sepuluh hal. Bisa selesai dalam satu pertemuan dua jam** kalau Bu Niken,
Fairol, dan Pak Indra hadir bersama, dan berkas SO sudah dikirim sebelumnya.

Sisanya — 47 pertanyaan lain — bisa dijawab sambil jalan.

---

# Yang TIDAK dibutuhkan

Supaya tidak ada yang menunggu hal yang salah:

- **NPWP ISLI** — akan diisi sendiri oleh pengguna di halaman pengaturan.
- **Daftar nama vendor** — bisa ditambahkan sendiri kapan saja lewat aplikasi.
  Yang dibutuhkan hanya NPWP dan terminnya, dan itu pun bisa menyusul.
- **Rancangan tampilan** — sudah ada dan sudah bisa dilihat.
- **Keputusan teknologi** — sudah ditetapkan dan tercatat alasannya.
- **Anggaran** — belum perlu ditetapkan. Fase 0 sengaja dibuat kecil supaya
  keputusan besar diambil setelah ada yang bisa dilihat, bukan sebelumnya.
