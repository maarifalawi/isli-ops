# Jawaban Klien

Catatan jawaban dari Alawi (developer) atas pertanyaan discovery.
Setiap jawaban dicatat apa adanya, termasuk yang masih "belum tahu".

**Sesi 1 — 13 Agustus 2026**

---

## Yang sudah dijawab

| # | Pertanyaan | Jawaban | Dampak |
|---|---|---|---|
| 1 | NPWP ISLI | Diinput user lewat halaman pengaturan | ✅ Q20 ditutup → jadi field, bukan konstanta |
| 2 | Sampel invoice cukup? | Cukup, 2 sampel | ⚠️ IMPORT belum ada — lihat catatan di bawah |
| 3 | Daftar vendor | Diinput user | ✅ Q24 ditutup → CRUD master data |
| 4 | Contoh POD | Menyusul | ✅ tidak memblokir |
| 5 | Jumlah job per bulan | Tidak tentu, tidak tahu | ⚠️ rancang untuk 100/bulan |
| 6 | Jumlah user | **4 orang** — Pak Indra (master), 1 manager, 2 karyawan | ✅ RBAC 7 peran → **3 peran** |
| 7 | Perangkat approval | Laptop **dan** HP | ✅ responsif wajib, bukan opsional |
| 8 | Lokasi | Bekasi saja | ✅ satu zona waktu, tanpa multi-cabang |
| 9 | Mata uang | "Rupiah" | ⚠️ **bertentangan dengan data** — lihat di bawah |
| 10 | Deadline | Secepatnya, tapi maksimal | ⚠️ konflik — lihat di bawah |
| 11 | Anggaran | Belum ada | 🔴 harus diusulkan |
| 12 | Setelah go-live | **Diserahkan ke klien** | 🔴 dampak besar — lihat di bawah |
| 13 | Yang melatih staf | Manager (Bu Niken) | ✅ butuh panduan bahasa Indonesia |
| 14 | Accurate | Berlangganan, detail belum ditanya | ✅ berarti **Accurate Online** → API tersedia |
| 15 | Retensi data | Tidak tahu, belum ditanya | ✅ dijawab oleh hukum — lihat di bawah |
| 16 | Prosedur sistem mati | Belum dibahas | 🔴 tetap perlu diputuskan |

---

## Catatan atas jawaban tertentu

### Mata uang — jawaban "rupiah" tidak cocok dengan dokumen

Rumus di job sheet EXIM:

```
E13 = 18.200          kurs USD, per job
E16 = 510             USD
F16 = =E16*E13        -> 9.282.000 IDR
```

Jadi yang benar: **transaksi bisa dalam USD, invoice selalu IDR.**

Sistem tetap butuh kolom USD + kurs per job. Ini **bukan** multi-currency
akuntansi (tidak ada buku besar USD), tapi juga **bukan** rupiah murni.

→ Perlu dikonfirmasi ulang ke Bu Niken (Q49).

### Jumlah user — 4 orang, tapi 5 nama muncul

Nama yang muncul di dokumen dan transkrip:

```
Pak Indra          owner, approval final
Bu Niken           manager keuangan
Fairul Ikhsan      pembuat file Excel
Mundofir 01        penyusun invoice
Lana               operasional
```

Itu 5 orang untuk 4 akun. Satu orang tidak kebagian akses, atau ada nama yang
sebenarnya orang yang sama.

→ Perlu daftar nama + email + peran yang pasti (Q50).

### Invoice IMPORT belum ada sampelnya

Dua sampel yang ada: **domestik** dan **ekspor**. Belum ada **impor**.

Risikonya bukan format nomor — itu tinggal `INVIMP`. Risikonya baris biaya:
impor biasanya membawa bea masuk, PPN impor, dan PIB yang tidak muncul sama
sekali di sampel yang ada.

→ Aman kalau **Fase 1 hanya domestik + ekspor**. Impor masuk Fase 2 setelah
ada sampel.

### "Secepatnya, tapi maksimal"

Dua permintaan ini saling tarik. Yang bisa dikunci cuma dua dari tiga:
cakupan, mutu, tanggal.

Usulan: **kunci mutu, kunci cakupan, biarkan tanggal mengikuti** — tapi potong
jadi irisan kecil supaya ada yang bisa dilihat Pak Indra tiap 1–2 minggu.

Ini juga jawaban atas kegagalan proyek sebelumnya: yang bikin gagal bukan
lambat, tapi tidak ada yang kelihatan sampai terlambat.

### "Gua serahin" — ini mengubah beberapa keputusan teknis

Kalau sistem diserahkan setelah go-live, maka:

| Konsekuensi | Tindakan |
|---|---|
| Kode dibaca orang lain | Hindari abstraksi pintar. Boring code menang. |
| Tidak ada yang paham arsitektur | `RUNBOOK.md` wajib, bahasa Indonesia |
| Hosting atas nama siapa? | 🔴 harus diputuskan sebelum deploy (Q51) |
| Siapa pegang akses database? | 🔴 belum diputuskan (Q52) |
| Siapa bayar langganan bulanan? | 🔴 belum diputuskan (Q53) |
| Ada masa garansi? | 🔴 harus masuk kontrak (Q54) |

Serah terima tanpa akun dan tagihan yang jelas itu sumber masalah paling umum.
Harus masuk proposal, bukan dibicarakan belakangan.

### Retensi data — tidak perlu ditanya, sudah diatur undang-undang

**UU KUP Pasal 28 ayat (11)**: buku, catatan, dan dokumen yang menjadi dasar
pembukuan wajib disimpan **10 tahun di Indonesia**, termasuk yang disimpan
secara elektronik.

Konsekuensi teknis:

- **Tidak ada penghapusan permanen.** Semua pakai `deleted_at`, bukan `DELETE`.
- `audit_log` tidak boleh dipangkas.
- Lampiran invoice dan bukti bayar ikut aturan 10 tahun.
- Cadangan data harus bisa dipulihkan sampai 10 tahun ke belakang.

---

## Notifikasi — WhatsApp berbayar, dan bukan pilihan terbaik

**Ya, berbayar.** Meta menagih per pesan, ditagih dalam rupiah.

| Kategori | Tarif per pesan | Untuk apa |
|---|---|---|
| Utility | ± Rp 357 | notifikasi transaksi — ini yang relevan |
| Marketing | ± Rp 586 | promosi |
| Authentication | ± Rp 357 | OTP |

Belum termasuk PPN 11% dan biaya BSP (Qiscus, Twilio, dsb).

Catatan penting: **mulai 1 Oktober 2026** Meta mulai menagih pesan service yang
sebelumnya gratis.

### Hitungan untuk ISLI

```
± 19 job/bulan x 4 notifikasi   =  76 pesan
76 x Rp 396 (termasuk PPN)      =  Rp 30.096 / bulan
Langganan BSP                    =  Rp 300.000 - 600.000 / bulan
                                    ---------------------------
Total                            ≈  Rp 500.000 / bulan
```

**Bayar Rp 500 ribu untuk kirim pesan senilai Rp 30 ribu.** Biaya langganannya
yang mahal, bukan pesannya.

### Usulan

| Fase | Cara | Biaya |
|---|---|---|
| **1** | Badge di aplikasi + **push PWA** | **Rp 0** |
| 1 | Email untuk ringkasan harian | ≈ Rp 0 |
| 2 | WhatsApp, kalau memang terbukti perlu | ± Rp 500rb/bln |

Karena tampilan **harus responsif untuk HP**, aplikasinya jadi PWA. Dan PWA
dapat **push notification gratis** — muncul di layar kunci HP persis seperti
WhatsApp, tanpa Meta, tanpa BSP, tanpa persetujuan template.

Untuk 4 orang di satu kantor di Bekasi, itu lebih dari cukup.

---

## Accurate — terkonfirmasi bisa

"Berlangganan" berarti **Accurate Online**, dan Accurate Online punya API resmi
untuk pihak ketiga.

Alurnya: daftar aplikasi di area developer → OAuth → Bearer token → pilih
database → `open-db` untuk dapat host dan session → baru bisa panggil endpoint.

Artinya Fase 3 **layak secara teknis**. Yang masih perlu ditanya:

- Paket langganan yang mana (menentukan endpoint yang terbuka)
- Siapa yang pegang akun developer
- Arah data: ISLI → Accurate saja, atau dua arah
- Objek apa yang disinkronkan: Sales Invoice, Purchase Invoice, atau Journal

→ Q55

---

# Putaran 3 — 13 Agu 2026, 16:52 WIB

Jawaban atas `docs/DAFTAR-KEBUTUHAN.md`. Sumber: Alawi, meneruskan keputusan klien.

---

## ✅ TERTUTUP — dengan akibat langsung ke kode

### B2 — Pembulatan pajak: **KE ATAS**

Diuji ke dua invoice cetak sebelum diterapkan:

| Invoice | Nilai sebelum bulat | Ke atas | Setengah ke atas | Invoice cetak |
|---|---|---|---|---|
| Diametral PPN | 1.458.853,451 | **1.458.854** | 1.458.853 | — |
| Diametral grand | | **131.429.434** ✅ | 131.429.433 ❌ | 131.429.434 |
| Materee PPN | 248.600,000 | 248.600 | 248.600 | — |
| Materee grand | | **23.848.600** ✅ | 23.848.600 ✅ | 23.848.600 |

Diametral adalah kasus pembeda. **Hanya pembulatan ke atas yang cocok.**

Kesimpulan tambahan yang ikut terbukti: invoice cetak Diametral **tidak** salah
ketik. Dugaan (a) dan (c) di catatan lama gugur.

**Perubahan kode:**
- `src/lib/money/index.ts` — `applyRateBp()` jadi pembulatan ke atas
- `tests/golden/invoice-tax.golden.test.ts` — test yang sengaja merah **kini hijau**,
  plus satu test baru yang menjaga agar tidak diam-diam kembali ke half-up

Blocker #4 dari sepuluh: **selesai.**

### C5 — Staf boleh melihat GP: **BOLEH**

Membalik aturan R-A6 yang sebelumnya dipasang.

**Perubahan kode:**
- `src/lib/authz/index.ts` — `job:view_margin` dan `report:view` diberikan ke STAFF
- `tests/unit/authz.test.ts` — pernyataan dibalik
- `src/app/page.tsx` — catatan diperbarui

Aksi `job:view_margin` sengaja **tidak dihapus**. Kalau keputusan ini dibalik lagi,
cukup keluarkan satu baris dari daftar STAFF — bukan menyebar pengecekan baru ke
seluruh aplikasi.

### C1 — Proyek yang dulu: **bukan proyek ISLI**

Itu proyek di tempat kerja Pak Indra sebelumnya, bukan di ISLI.

**Perubahan dokumen:** `docs/UNTUK-PAK-INDRA.md` diperbaiki di tiga tempat.
Sebelumnya tertulis "Bapak pernah gagal membangun sistem" dan "orang-orang yang
terlibat waktu itu sebagian masih terlibat sekarang". Dua kalimat itu keliru dan
berpotensi menyinggung. Sudah diganti.

Pertanyaannya tetap diajukan, tapi kini dibingkai sebagai pelajaran, bukan tuduhan.

---

## ✅ TERTUTUP — keputusan lingkup

| # | Pertanyaan | Jawaban | Akibat |
|---|---|---|---|
| A3 | Contoh POD | POD hanya bukti foto, sisanya input manual | Fitur unggah lampiran **masuk** lingkup. Menutup C9. Tidak lagi blocker. |
| A5 | Contoh INVIMP | Nomor invoice impor diketik manual | Sistem tidak membuat nomor INVIMP otomatis. Keunikan tetap dipaksakan. |
| B3 | Dasar jatuh tempo | Diputuskan klien, diketik manual | `computeDueDate()` turun jadi **usulan**, bukan penentu. Boleh ditimpa. |
| B4 | Hari kalender / kerja | Ikut kalender | Tidak perlu tabel hari libur. |
| B8 | Tarif PPN | 1,1% hanya **nilai awal**, bisa diubah | Tarif disimpan **per baris**, bukan konstanta global. |
| C2 | Data historis | Dimigrasi | Irisan 9 tetap ada. Bergantung penuh pada berkas `SO BULAN *.xlsx`. |
| C3 | Pemindahan biaya antar job | Boleh, tercatat, butuh persetujuan | Tabel `cost_reallocation` **masuk**. Menutup ADR-0006. |
| C6 | Manajer yang membuat job | Persetujuan langsung ke Pak Indra | Satu tahap, bukan dua. |
| D1 | Kas di sheet tersembunyi | Tidak masuk lingkup | D2, D3, D4 ikut gugur. |
| F1 | Langganan atas nama | ISLI | — |
| F2 | Akses database produksi | Pihak ISLI | — |
| F3 | Pembayar langganan | Alawi, satu tahun di muka | Lihat catatan di bawah. |
| F4 | Masa garansi | 2 bulan | Cocok dengan usulan 60 hari. |

---

## ⚠️ BELUM TERTUTUP — perlu ditanyakan lagi

### B7 — Penomoran (pertanyaannya diulang, bukan dijawab)

Masih perlu jawaban tegas:
- Counter DOM / EXP / IMP **terpisah** atau satu?
- Reset tiap **bulan** atau tiap **tahun**?
- Nomor job yang dibatalkan **hangus** atau dipakai ulang?

Asumsi yang berjalan sekarang, dibaca dari format `ISLI-26.08-005`: tiga counter
terpisah, reset bulanan, nomor batal hangus. **Ini asumsi, belum jawaban.**

Salah di sini berarti nomor job kembar di tahun berjalan — dan di data lama sudah
ada 16 kejadian.

### C4 — "Jangan sampai berhenti"

Ini harapan, bukan prosedur. Tidak ada sistem yang tidak pernah mati, dan yang
mendekati itu harganya berlipat.

Yang perlu dijawab: **kalau sistem mati satu jam di hari kerja, orang di kantor
melakukan apa?** Tiga pilihan nyata:

1. Berhenti dan menunggu — murah
2. Catat di kertas, input ulang setelah pulih — murah, perlu kebiasaan
3. Mode baca-saja dari cadangan — mahal, perlu penyiapan khusus

Tanpa jawaban ini, target ketersediaan tidak bisa ditetapkan dan biaya bulanan
tidak bisa dihitung tepat.

### F3 — Langganan dibayar Alawi satu tahun di muka

Dicatat, tapi ada dua hal yang perlu disadari:

1. **Biayanya sekitar Rp 9 juta setahun.** Kalau tidak dimasukkan ke harga
   penawaran, itu potongan langsung dari margin.
2. **Bertabrakan dengan F1.** Langganan atas nama ISLI tapi dibayar Alawi berarti
   kartu pembayaran pribadi terpasang di akun milik ISLI. Saat serah terima,
   kartunya harus dicabut — dan kalau terlewat, tagihan jalan terus.

Saran: akun atas nama ISLI sejak awal, kartu ISLI, dan tahun pertama
diganti sebagai potongan harga. Hasil akhirnya sama bagi Pak Indra, tapi tidak ada
yang perlu dicabut belakangan.

---

## Catatan atas "jangan terlalu fokus ke data contoh"

Diterima sebagai arahan arsitektur: struktur sistem tidak boleh dibentuk oleh
kebetulan yang ada di berkas contoh. Itu benar dan sudah dijalankan — misalnya
tarif PPN kini jadi kolom per baris, bukan konstanta.

Satu hal yang perlu dipisahkan: klien sendiri sudah menegaskan berkas-berkas itu
**bukan karangan, melainkan data nyata yang diberikan sebagai contoh**
(lihat Putaran 1). Karena itu:

- Angka **Rp 22.500.000** tetap sah dan tetap jadi bahan utama ke Pak Indra
- Aturan pembulatan barusan **hanya bisa dipastikan** karena kedua invoice itu ada

Kedua hal itu diperoleh justru dari membaca berkas contoh dengan teliti. Jadi:
jangan dijadikan cetakan struktur, tapi tetap dipakai sebagai alat uji.

---

## Skor

Dari sepuluh blocker: **empat tertutup** (pembulatan, migrasi, pemindahan biaya,
serah terima). **Enam masih terbuka:**

1. gsoft itu apa
2. Berkas `SO BULAN *.xlsx`
3. Aturan PPh 23
4. Dasar hitung jatuh tempo — *sebagian tertutup: diketik manual, tapi tetap
   perlu tahu tanggal apa yang biasanya dipakai supaya usulannya masuk akal*
5. Costing `26.08-005` mana yang benar
6. Aturan penomoran dan reset counter

---

# Putaran 4 — 13 Agu 2026, 19:32 WIB

## Q01 TERTUTUP — blocker tertinggi hilang

> **Pak Indra (lewat Alawi):** "gsoft itu sistem di perusahaannya sebelumnya yang
> dipegang sama Pak Indra, dan nggak ada hubungannya sama sekali sama perusahaan
> yang sekarang."

Ini menutup **empat** pertanyaan sekaligus:

| # | Pertanyaan | Status |
|---|---|---|
| Q01 | gsoft itu aplikasi apa | ✅ sistem perusahaan lama, di luar lingkup |
| Q02 | Format `SEVFJK25040002` | ✅ nomor sistem lama, tidak perlu didukung |
| Q03 | Cut-off Mei vs April | ✅ catatan sisa, aturan ISLI tetap P-INV-3 |
| Q48 | Nomor beda format di sheet tersembunyi | ✅ sama dengan Q02 |
| Q36 | "VFL INDONESIA" | 🟡 hampir — kemungkinan besar template warisan dari tempat kerja lama |

## Akibat pada rencana

1. **Proyek ini greenfield.** Bukan migrasi sistem, bukan penggantian. Arsitektur
   dan harga Fase 1 di `PROPOSAL-PHASES.md` **tidak perlu dihitung ulang**.
2. **Batas "jangan lewat Irisan 4" DICABUT.** Sebelumnya pembangunan dibatasi
   sampai Irisan 4 karena gsoft bisa mengubah bentuk proyek. Sekarang seluruh
   peta irisan boleh dijalankan sesuai urutan.
3. **Tabel `gsoft_mapping` dibatalkan permanen.** Dihapus dari `ERD.md` dan dari
   `.clinerules/workflows/db-migrate.md`.
4. **Blocker nomor satu sekarang Q41** — berkas `SO BULAN *.xlsx`.

## Satu hal yang tetap harus dijaga

Sheet tersembunyi `BELUM ADA DI REPORT` berisi baris yang **bukan milik ISLI**.
Jangan pernah ikut dihitung dalam laporan apa pun.

Kabar baiknya: angka April–Juli di `RECONCILIATION-REPORT.md` **tidak terpengaruh**,
karena sheet itu memang berada di luar rekap. Temuan Rp 22,5 juta tetap sah.

## Skor blocker

| | Sebelum putaran 4 | Sesudah |
|---|---|---|
| Blocker terbuka | 6 | **2** |
| Sisanya | Q01, Q04, Q10, Q41, Q49, B7 | **Q41** (berkas SO BULAN) dan **Q04** (aturan PPh 23) |

Q10 dan Q49 turun jadi kuning karena keduanya soal data contoh, bukan soal
struktur. B7 (aturan reset penomoran) dijadikan **pengaturan di aplikasi**,
sehingga tidak lagi menghalangi pembangunan.

---

# Putaran 5 — 13 Agu 2026, 19:56 WIB

Crosscheck lengkap kebutuhan sistem terhadap isi repo. Hasil: **10 sudah ada, 5 setengah, 4 kosong.**

## Yang ditutup putaran ini

| Hal | Keputusan | Dampak |
|---|---|---|
| **Format nomor job** | `ISLI-26.07-001` — sesuai invoice asli, bukan `ISLI.26-07-001` | Nol. Kode penomoran sudah benar. |
| **Kombinasi leg** | `1`, `2`, `3`, `1+2`, `2+3`, `1+2+3` sah. `1+3` tanpa `2` mutlak dilarang. Minimal satu leg wajib. | `ck_legs` CHECK **akhirnya diimplementasikan** di skema |
| **Domestik 3 leg** | Default `1+2+3`, boleh diubah, **wajib alasan tercatat** | Kolom baru `leg_override_alasan`. Q26 tertutup. |
| **Top 3 Revenue** | Semua sumbu: customer, vendor, segmen, sales, rute | R14.2 — dipisah **pendapatan** vs **belanja** |
| **Penawaran** | Ditahan, fokus bangun sistem dulu | Banner peringatan di `PROPOSAL-PHASES.md` |

## Yang ditambahkan ke rancangan

Tiga kebutuhan ini **tidak ada** di rancangan sebelumnya. Bukan setengah jadi — nol.

| # | Fitur baru | Ke mana |
|---|---|---|
| F12 | Filter rentang bulan A → bulan B di semua laporan | R14.1, Slice 8a, US-08 |
| F13 | Halaman peringkat multi-sumbu + drill-down berlapis | R14.2–R14.4, Slice 8c/8d, US-08 |
| F14 | Field wajib pada baris buying | R15, US-09 |

Perubahan kode di Irisan 0:

```
charge_codes.butuh_vendor      BOOLEAN NOT NULL DEFAULT true
jobs.leg_override_alasan       TEXT
ck_legs CHECK                  1+3 tanpa 2 dilarang, minimal satu leg
idx_job_sales, idx_job_rute    indeks untuk halaman peringkat
```

## Kesalahan rancangan yang ketahuan dari crosscheck ini

**`charge_line.vendor_id` boleh kosong.** Artinya biaya Rp 9.577.000 bisa masuk
tanpa menyebut vendornya siapa. Kalau itu terjadi, rekap utang per vendor dan
rekap PPh 23 per vendor langsung bolong — tepat dua hal yang paling Bu Niken
butuhkan.

Tidak diperbaiki dengan `NOT NULL`, karena tidak semua kode biaya punya vendor
(`MATERAI`, `HANDLING OPS`). Solusinya per kode biaya lewat `butuh_vendor`,
ditegakkan di lapis aplikasi. Lihat R15.4.

**Konflik dokumen soal rekap pajak.** `BUILD-PLAN.md` menaruh rekap PPh 23 di
Fase 1, `ERD.md` menunda tabel `tax_report_period` ke Fase 2. Diselesaikan:
rekap **dihitung dari data**, bukan disimpan di tabel. Tidak butuh tabel baru,
jadi tetap di Fase 1. Sejalan dengan R14.5.

## 5 pertanyaan baru — Q64 sampai Q68

| # | Isi | Ke |
|---|---|---|
| Q64 | 🔴 Dari 43 kode biaya, mana yang boleh tanpa vendor? | Niken |
| Q65 | Field buying wajib lainnya apa saja? | Niken |
| Q66 | Rute perlu dinormalisasi jadi master pelabuhan? | Niken, Fairol |
| Q67 | Siapa orang di balik kode sales `KIM`, `VIN`, `RIK`, `YUD`? | Fairol |
| Q68 | 🔴 **Periode laporan pakai tanggal apa — ETD, tanggal job, atau tanggal invoice?** | Niken |

> **Q68 paling menentukan.** Kalau salah pilih, angka laporan akan beda dari
> rekap yang Bu Niken pegang sekarang, dan sistem akan dianggap salah padahal
> cuma beda definisi periode.

---

# Putaran 6 — 13 Agu 2026, 20:30 WIB — invoice susulan/koreksi

Kasus konkret dari klien: invoice sudah dicetak dan terkunci Rp 15.000.000,
seharusnya Rp 16.000.000. Kekurangan Rp 1.000.000 ditagih bulan berikutnya,
**nomor invoice benar-benar identik** dengan yang pertama, dibedakan lewat label.

## Jawaban klien

| Pertanyaan | Jawaban |
|---|---|
| Bentuk nomor — identik atau pakai suffix? | **Benar-benar identik.** Tidak ada suffix seperti `-R1`. |
| Selisih kena pajak lagi? | **Tidak tahu** — "dia bilangnya gitu doang" |
| Nomor job ikut sama? | **Tidak.** Hanya nomor invoice yang sama. Nomor job tidak disinggung sama sekali. |

## Kenapa ini tidak bisa jadi baris `customer_invoice` baru

`uq_inv UNIQUE(inv_type, issue_year, running)` justru **menolak** dua baris
bernomor identik — kalau dipaksa, sistem akan mengira itu duplikat seperti
kasus vendor 01A/01B, padahal di sini duplikasinya disengaja dan sah.

## Solusi yang dibangun: R16, tabel `customer_invoice_addendum`

Bukan invoice baru yang berdiri sendiri — tabel terpisah yang **merujuk** ke
invoice asal:

- Nomor yang tercetak **disalin** dari invoice asal saat mencetak, tidak
  disimpan ulang sebagai teks bebas — supaya tidak ada risiko salah ketik dan
  tidak perlu memvalidasi keunikan teksnya.
- Kunci unik sebenarnya ada di `(original_invoice_id, addendum_seq)`.
- Label pembeda (`label_internal`, misal `SUSULAN-1`) **wajib**.
- Alasan **wajib**, masuk audit log — pola yang sama seperti alasan
  penyimpangan leg (R10) dan alasan unlock (R6.2).
- Invoice pertama **tidak diubah sama sekali** — I-INV-1 tetap berlaku.

## Yang masih default, menunggu jawaban — Q69, Q70, Q71

Karena jawaban pajak belum ada, sistem dibangun dengan **default paling
defensif**, bukan menunggu kosong:

| # | Default sekarang | Kalau jawabannya beda |
|---|---|---|
| Q69 🔴 | Selisih kena pajak lagi, dihitung sebagai transaksi pajak **baru dan berdiri sendiri** (bukan mengubah pajak invoice pertama) | Tinggal ubah di tabel addendum, invoice pertama tidak perlu disentuh |
| Q70 | Perlu disetujui Manager atau Owner (bukan pembuatnya sendiri) sebelum berlaku | Tinggal ubah syarat approval-nya |
| Q71 | Label terlihat di kertas yang diterima customer, bukan cuma catatan internal | Tinggal disembunyikan dari cetakan |

**Alasan default Q69:** invoice pertama sudah dibekukan (I-INV-1) supaya angka
yang sudah dilaporkan ke pajak tidak berubah-ubah. Menghitung ulang pajak
invoice pertama untuk memasukkan Rp 1 juta akan melanggar aturan itu sendiri.
Memperlakukan selisihnya sebagai transaksi baru adalah satu-satunya cara yang
tidak membongkar sesuatu yang sudah beku.

🔴 **Q69 jadi blocker sebelum Slice 6 (invoice customer) dianggap selesai** —
kodenya boleh dibangun sekarang, tapi tidak boleh dianggap final tanpa
konfirmasi Bu Niken.

---

# Putaran 7 -- transkrip versi 2 (13 Agu 2026, 22:25 WIB)

Klien mengirim rekaman kedua dari pertemuan yang sama, minta dicek apakah ada
yang masih kurang. Empat temuan, semua sudah diputuskan lewat survei sesi ini:

## 1. Addendum juga untuk invoice VENDOR (R17)
Sebelumnya R16 cuma menutup sisi customer. Transkrip 2 menunjukkan kasus yang
sama persis terjadi di sisi vendor: nomor invoice vendor yang sama dipakai dua
kali untuk menagih sisa di bulan berikutnya. Dibuat tabel `vendor_invoice_addenda`
yang simetris dengan `customer_invoice_addenda`, tanpa melonggarkan
`uq_vendor_invoice` yang mencegah kasus 01A/01B (R7.1).

## 2. Invoice boleh terbit sebelum POD, dengan approval (R9.4b)
Klien cerita customer terkadang minta invoice keluar duluan sebelum POD
kembali, karena ingin bayar cepat. Ditambahkan jalur khusus: `issued_before_pod`
+ `early_issue_approved_by` (wajib kalau jalur ini dipakai). R9.4 (tidak boleh
tanpa POD) tetap berlaku sebagai default.

## 3. Buka gembok biaya wajib berita acara (R6.4 diformalkan)
Klien menjelaskan PIC + Sales membuat dokumen berita acara bersama sebelum
diajukan ke Pak Indra -- bukan cuma penjelasan lisan, dan tidak ada ambang nilai
minimum yang boleh lewat tanpa ini. Dibuat tabel `cost_reopen_requests` dengan
`berita_acara_file_url` wajib.

## 4. Kode biaya: FIXED vs OPSIONAL (R15.5)
Klien membedakan biaya yang selalu muncul di setiap job (Ocean Freight, BL,
THC, LSS, trucking, dooring, segel) dari biaya ad-hoc yang diinput bebas
(uang makan supir, biaya timbang, additional freight). Ditambahkan
`charge_codes.kategori` (FIXED | OPSIONAL), default OPSIONAL untuk kode baru.

## Yang masih menunggu jawaban (Q76-Q79)
- Q76 🔴 Dari 43 kode biaya, mana saja yang FIXED? (NIKEN)
- Q77 ⚠️ Approval addendum vendor -- levelnya sama seperti addendum customer? (INDRA)
- Q78 ⚠️ Siapa yang approve jalur invoice-sebelum-POD? (INDRA)
- Q79 ⚠️ Berita acara -- format bebas atau ada template baku? (NIKEN)

## Yang sudah dikonfirmasi lewat transkrip 2, tidak perlu diubah
Model leg 1/2/3, mekanisme lock sampai cut-off yang butuh approval untuk
dibuka, GP dihitung sebelum pajak dan NETT sesudah pajak, ringkasan bulanan
per nomor job, dan rencana generate invoice otomatis dari data job -- semuanya
sudah sesuai dengan yang sudah dibangun sebelumnya.
