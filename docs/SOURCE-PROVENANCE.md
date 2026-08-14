# Asal-Usul & Kepercayaan Dokumen Sumber

> **Status akhir: DATA ASLI, TERVERIFIKASI, tapi SEBAGIAN.**
> Q37 dijawab klien 13 Agu 2026: tidak ada baris atau kolom yang dihapus
> sebelum berkas diserahkan.

## Ringkasan

| Pertanyaan | Jawaban |
|---|---|
| Data karangan atau asli? | **Asli.** Dokumen operasional, diserahkan sebagai contoh. |
| Ada yang dihapus sebelum dikirim? | **Tidak.** Dikonfirmasi klien + diverifikasi teknis. |
| Semua sheet sudah diperiksa? | **Ya.** 8 sheet di 2 berkas, termasuk 2 sheet tersembunyi. |
| Populasi lengkap? | **Bukan.** Contoh Apr–Jul 2026 saja. |
| Temuan audit sah dipakai? | **Ya**, dengan catatan cakupan. |

---

## Bukti metadata

Dari `docProps/core.xml` dan `docProps/app.xml`.

| Berkas | Dibuat | Pembuat | Diubah terakhir | Oleh | Waktu edit |
|---|---|---|---|---|---|
| KEPENTINGAN PEMBUATAN SISTEM.xlsx | 12 Agu 2026 07:37 | Fairul Ikhsan | 12 Agu 09:12 | Fairul Ikhsan | — |
| DUMMY SUMMARY REPORT.xlsx | **16 Mei 2025** | VFL INDONESIA | 12 Agu 09:10 | **Cecilia Niken** | — |
| KOP Surat ISLI VALID.docx | 13 Apr 2026 | Fairul Ikhsan | 15 Apr 2026 | Niken Integra | 27 menit |
| INVOICE MATEREE 06-012.docx | 14 Jul 2026 | Fairul Ikhsan | 14 Jul 2026 | **Mundofir 01** | **349 menit** |
| INVOICE DIAMETRAL 07-003.docx | 16 Jul 2026 | Fairul Ikhsan | 16 Jul 2026 | **Mundofir 01** | 1 menit |
| DESCRIPTION.pdf | 13 Agu 2026 07:20 WIB | iPhone (Quartz) | — | — | — |

### Yang menguatkan

1. **Summary report berumur 15 bulan.** Mei 2025 → Agu 2026. Berkas karangan
   tidak punya riwayat sepanjang itu.
2. **Invoice Materee dikerjakan 349 menit.** Hampir 6 jam waktu edit nyata.
3. **Catatan tangan difoto 2 menit sebelum dikirim.**
4. **Ketidakrapian organik.** ETD 2006, tiga gaya rumus tanggal, rentang SUM
   yang meleset. Data karangan biasanya justru terlalu rapi.

---

## Verifikasi kelengkapan sheet

Dilakukan setelah klien mempertanyakan apakah semua halaman sudah dibaca.
Memang benar — pemeriksaan awal membaca isi, tapi **belum memverifikasi
struktur berkas**. Pemeriksaan ulang menemukan 4 hal baru.

### `KEPENTINGAN_PEMBUATAN_SISTEM.xlsx`

| Sheet | State | Dimensi |
|---|---|---|
| SO DOMESTIK FCL | visible | B3:H44 |
| CONTOH LCL | visible | B3:H37 |
| SO SEA EXIM | visible | B2:I50 |

Tanpa sheet tersembunyi, tanpa defined name, tanpa external link. ✅ lengkap.

### `DUMMY_SUMMARY_REPORT.xlsx`

| Sheet | State | Dimensi | Catatan |
|---|---|---|---|
| BELUM ADA DI REPORT | **hidden** | A1:A1 | catatan gsoft, 1 sel |
| SUMMARY 2026 | visible | B3:J42 | |
| EXIM | visible | B3:Y67 | **tanpa baris tersembunyi** |
| DOM | visible | B4:AA96 | baris 1–3 tersembunyi — **kosong** |
| Sheet1 | **hidden** | B3:E30 | **kas & dropping** |

Juga diperiksa: chartsheet 0, macrosheet 0, dialogsheet 0, defined name 0,
external link **1**.

### Kenapa ini membuktikan tidak ada penghapusan

Sheet `EXIM` **tidak punya baris tersembunyi maupun bekas penghapusan**.
Rumus `SUM(Q39:Q48)` di baris 50 utuh dan konsisten dengan `SUM(O39:O48)` dan
`SUM(P39:P48)` di baris yang sama. Kalau ada baris dihapus, ketiga rentang itu
akan ikut bergeser bersamaan — dan tidak akan menyisakan `F19` yang menunjuk
baris 39 sementara `D19` dan `E19` menunjuk baris 50.

> **Kesimpulan: bug-nya asli.**

---

## 4 hal baru yang ditemukan dari verifikasi ini

### 1. 🔴 Berkas induk yang belum kita punya

```
D:\ISLI\SO 2026\SO BULAN APRIL 2026.xlsx    (12 sheet: 04-001..04-011 + Sheet2)
```

Satu berkas per **bulan**, satu sheet per **job**. Hanya April yang tertaut;
Mei–Juli diketik manual. **Minta seluruh berkas `SO BULAN *.xlsx`** — itu
sumber costing per job yang sesungguhnya. (Q41, Q42)

### 2. 🔴 Sheet tersembunyi `Sheet1` berisi kas

Dropping 200.000.000 dari Pak Teguh, pemakaian 210.119.411 — **lebih pakai
10.119.411**. Bercampur cicilan mobil dan petty cash. Modul kas belum masuk
scope mana pun. (Q43–Q45)

### 3. ✅ Dua bug tidur

`J13 = SUM(F12:F13)` melewatkan baris 11, dan `F37 = SUM(F11:F35)` beda satu
baris dari `D37 = SUM(D11:D36)`. Hasilnya benar sekarang **hanya karena baris
terkait kebetulan kosong**.

### 4. ✅ Koreksi analisis awal

| Analisis awal | Yang benar |
|---|---|
| "Satu job = satu berkas terpisah" | Satu berkas per **bulan**, satu sheet per job |
| "`DOM!Q91` bikin summary salah 10,2 juta" | Salah di tab DOM, **tidak** merambat ke SUMMARY |

---

## Batasan yang tetap berlaku

**Ini contoh, bukan populasi lengkap.** 75 job di `fixtures/` bukan seluruh job
ISLI. Jangan menyebut totalnya sebagai "total GP ISLI" — sebut
"dari berkas contoh April–Juli 2026".

---

## Orang & entitas dari metadata

| Nama | Temuan | Tindak lanjut |
|---|---|---|
| **Mundofir 01** | Pengedit terakhir kedua invoice. Tidak pernah disebut di meeting. | Q35 — calon pengguna harian, masuk RBAC |
| **VFL INDONESIA** | Pembuat asli summary report (Mei 2025). | 🟡 Kemungkinan besar **template warisan** dari tempat kerja Pak Indra sebelumnya — konsisten dengan jawaban gsoft 13 Agu 2026. Sisa: pastikan tidak ada baris data VFL yang terbawa. |
| **Fairul Ikhsan** | = "Fairol" di transkrip. Pembuat hampir semua berkas. | PIC data |
| **Cecilia Niken** / **Niken Integra** | Dua akun. Satu orang atau dua? | Q38 |
