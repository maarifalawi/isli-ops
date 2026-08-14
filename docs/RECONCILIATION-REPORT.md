# Reconciliation Report — audit `DUMMY SUMMARY REPORT.xlsx`

> **Status: TERVERIFIKASI.** Q37 dijawab klien 13 Agu 2026 — tidak ada baris
> atau kolom yang dihapus sebelum file diserahkan. Diperkuat pemeriksaan
> teknis: tidak ada baris tersembunyi di sheet `EXIM`, tidak ada sheet yang
> dilewatkan, tidak ada rentang yang terpotong akibat penghapusan.
>
> **Semua temuan di bawah adalah bug asli di file kerja klien.**

## Cakupan pemeriksaan

Seluruh 5 sheet diperiksa, termasuk yang tersembunyi:

| Sheet | State | Dimensi | Diperiksa |
|---|---|---|---|
| `BELUM ADA DI REPORT` | **hidden** | A1:A1 (1 sel) | ✅ |
| `SUMMARY 2026` | visible | B3:J42 | ✅ |
| `EXIM` | visible | B3:Y67 | ✅ |
| `DOM` | visible | B4:AA96, baris 1–3 tersembunyi (**kosong**) | ✅ |
| `Sheet1` | **hidden** | B3:E30 | ✅ |

Juga diperiksa: defined names (0), chartsheet (0), macrosheet (0),
external link (1 — lihat Temuan 6).

---

## TEMUAN 1 🔴 KRITIS — GP Export Juni menarik dari sel yang salah

Ini bukan dugaan. Perhatikan tiga sel di baris yang sama:

```
SUMMARY 2026 baris 19 (JUNE / EXPORT)
  D19 = EXIM!O50   ← selling, baris SUBTOTAL   ✓ benar
  E19 = EXIM!P50   ← cost,    baris SUBTOTAL   ✓ benar
  F19 = EXIM!Q39   ← GP,      baris SATU JOB   ✗ SALAH, harusnya Q50
```

Selling dan cost menarik dari baris 50 (subtotal). GP menarik dari baris 39
(satu job). Ini pola klasik rumus yang diseret lalu meleset.

```
EXIM!Q39 = O39-P39 = 13.000.000 - 12.000.000 =  1.000.000
EXIM!Q50 = SUM(Q39:Q48)                       = 23.500.000
```

| | Nilai |
|---|---|
| GP Export Juni dilaporkan | 1.000.000 |
| GP Export Juni seharusnya | 23.500.000 |
| **Selisih** | **22.500.000** |

**Merambat ke atas:**

```
J21 (TOTAL JUNE)  = SUM(F19:F21) = 57.700.000
cek H21 - I21                    = 80.200.000   ✗ beda 22.500.000

F37 (TOTAL 2026)  = SUM(F11:F35) = 257.650.000
cek H total - I total            = 280.150.000  ✗ beda 22.500.000
```

> **Rp 22.500.000 hilang dari laporan GP tahunan.** Angka ini terverifikasi dan
> boleh dibawa ke Pak Indra.

---

## TEMUAN 2 ⚠️ — Subtotal GP Domestik Juli terpotong (tapi tidak merambat)

**Koreksi dari versi sebelumnya laporan ini.** Analisis awal salah menyebut
dampaknya. Yang benar:

```
DOM baris 91
  O91 = SUM(O76:O90)   ← 15 baris  ✓
  P91 = SUM(P76:P90)   ← 15 baris  ✓
  Q91 = SUM(Q76:Q81)   ←  6 baris  ✗ berhenti di 81, harusnya 90
```

Sembilan baris GP tidak ikut terjumlah. `Q96` (grand total DOM) mewarisi
kesalahan ini karena `Q96 = Q51+Q24+Q74+Q91`.

**Tapi tidak sampai ke SUMMARY**, karena baris 25 menghitung ulang sendiri:

```
F25 = D25-E25 = 28.900.000   ✓ kebetulan benar
```

| Dampak | Status |
|---|---|
| Tab `DOM` menampilkan GP Juli yang salah | 🔴 nyata |
| Tab `SUMMARY 2026` menampilkan GP Juli yang benar | ✅ aman |

> Artinya: **dua tab di file yang sama menunjukkan angka berbeda untuk hal yang
> sama.** Tergantung tab mana yang dibuka, orang dapat jawaban berbeda.

---

## TEMUAN 3 🔴 — Dua bug tidur yang belum meledak

Ini yang paling berbahaya, karena **hari ini hasilnya masih benar**.

### 3a. Total April melewatkan baris EXPORT

```
H13 = SUM(D11:D13)   ← mulai baris 11  ✓
I13 = SUM(E11:E13)   ← mulai baris 11  ✓
J13 = SUM(F12:F13)   ← mulai baris 12  ✗ baris 11 (EXPORT) terlewat
```

Sekarang hasilnya benar **hanya karena April kebetulan tidak punya job export**
(baris 11 kosong). Begitu ada yang mengisi export April, total GP langsung
salah tanpa peringatan apa pun.

### 3b. Grand total selling dan GP pakai rentang berbeda

```
D37 = SUM(D11:D36)   ← sampai baris 36
F37 = SUM(F11:F35)   ← sampai baris 35  ✗ beda satu baris
```

Baris 36 masih kosong, jadi belum kelihatan. Begitu terisi, selling dan GP
tidak lagi konsisten.

> Bug tidur lebih berbahaya daripada bug yang kelihatan. Yang kelihatan
> ketahuan. Yang tidur meledak nanti, saat tidak ada yang curiga.

---

## TEMUAN 4 🔴 — Akar semua masalah: GP dihitung dengan dua gaya berbeda

Di kolom yang sama, `F`, ada dua cara menghitung GP:

| Baris | Rumus | Gaya |
|---|---|---|
| 13 APR DOMESTIC | `=D13-E13` | hitung sendiri |
| 15 MAY EXPORT | `=D15-E15` | hitung sendiri |
| 17 MAY DOMESTIC | `=D17-E17` | hitung sendiri |
| 25 JUL DOMESTIC | `=D25-E25` | hitung sendiri |
| 12 APR IMPORT | `=EXIM!Q13` | tarik dari sumber |
| 16 MAY IMPORT | `=EXIM!Q27` | tarik dari sumber |
| **19 JUN EXPORT** | **`=EXIM!Q39`** | **tarik dari sumber — SALAH** |
| 21 JUN DOMESTIC | `=DOM!Q74` | tarik dari sumber |
| 23 JUL EXPORT | `=EXIM!Q59` | tarik dari sumber |

**Kalau semua baris pakai `=D-E`, Temuan 1 mustahil terjadi.** Kesalahan itu
hanya bisa muncul karena ada baris yang menarik dari sumber luar.

> Ini argumen desain paling kuat untuk sistem baru:
> **GP hanya boleh dihitung di satu tempat, dari satu rumus.**
> Bukan soal Excel-nya jelek. Soal tidak ada satu sumber kebenaran.

---

## TEMUAN 5 ✅ — 16 tabrakan nomor job lintas segmen

Nomor `YY.MM-NNN` dipakai ulang di scope DOM, EXP, dan IMP. 16 pasang bentrok.
Bukan bug — memang tiga counter paralel. Tapi berarti kunci unik sistem
**wajib** `(seq_scope, year, month, running)`, bukan `job_no`.

---

## TEMUAN 6 🔴 — Ada berkas induk yang belum kita terima

External link mengarah ke:

```
D:\ISLI\SO 2026\SO BULAN APRIL 2026.xlsx
```

Isinya **12 sheet**: `04-001` sampai `04-011`, plus `Sheet2`.

**Koreksi dari analisis awal.** Sebelumnya disimpulkan "satu job = satu file".
Yang benar: **satu file per BULAN, satu sheet per JOB**.

Dan yang penting:

| Bulan | Sumber angka di summary |
|---|---|
| April | tertaut ke `SO BULAN APRIL 2026.xlsx` ✅ |
| Mei, Juni, Juli | **nilai ketik langsung**, tidak tertaut |

Artinya rantai penelusuran ke job asli **putus** setelah April.

> 🔴 **Minta seluruh berkas `SO BULAN *.xlsx` dari folder `D:\ISLI\SO 2026\`.**
> Itu sumber kebenaran costing per job yang sebenarnya — dan kita belum punya.
> Tanpa itu, migrasi data historis tidak mungkin akurat. (Q41)

---

## TEMUAN 7 🔴 — Sheet tersembunyi `Sheet1`: kas yang tidak seimbang

Sheet tersembunyi ini berisi pengelolaan kas, terpisah total dari costing job.

```
DROPPING dari Pak Teguh          200.000.000
Total PEMAKAIAN (12 baris)       210.119.411
>>> LEBIH PAKAI                   10.119.411
```

Rincian pemakaian termasuk hal yang **bukan biaya operasional job**:

| Item | Nilai | Catatan |
|---|---|---|
| PENGEMBALIAN KE RATINDO | 70.000.000 | Ratindo terdaftar sebagai **customer** |
| PEMBAYARAN CICILAN MOBIL | 6.000.000 | bukan biaya job |
| PETTY CASH | 5.000.000 | bukan biaya job |

Dan pembayaran kapal tidak cocok dengan tabel di atasnya:

| Kapal | Tabel atas | Realisasi | Selisih |
|---|---:|---:|---:|
| SELILI BARU (05-016) | 22.560.000 | 20.723.000 | 1.837.000 |
| PULAU LAYANG (05-007) | 22.560.000 | 29.015.000 | −6.455.000 |
| UMBUL MAS (05-014) | 26.220.000 | — | tidak muncul |

Dua kapal muncul di realisasi tapi tidak di tabel atas: KM LINTAS MAHAKAM
(17.060.000) dan KM ORIENTAL EMERALD (11.210.000).

> Ini bukan sekadar kerapian. Ini **modul kas yang belum ada di scope**, dan
> uangnya sudah dicampur dengan operasional. Q43–Q45.

---

## TEMUAN 8 ✅ — Temuan struktural lain

| # | Temuan | Bukti |
|---|---|---|
| 8a | Rumus NETT memasukkan PPN ke margin | `ISLI-26.08-005`: GP 3.465.000 vs NETT 3.883.000, beda 418.000 = persis PPN |
| 8b | Reimburse asimetris di rumus GP | LOLO 645.000 tidak masuk pembilang, tapi cost THC LOLO 4.805.000 masuk penuh |
| 8c | Dua versi costing untuk job yang sama | `26.08-005`: xlsx 32.085.000 vs cetak 34.535.000 (beda CHARGE TRUCKING 2.500.000) |
| 8d | ETD tertulis tahun 2006 | 2 baris, Excel menerima tanpa peringatan |
| 8e | Rumus tanggal tidak konsisten | `U12=T12+2`, `U14=T14+1`, `W14=(U14+V14)+3` |
| 8f | Pemindahan biaya antar job | catatan tangan: "DIPECAH KE 07-014" **"KARENA GP 7,27%"** |

---

## Angka final yang boleh dipakai

| | Nilai |
|---|---|
| Total selling Apr–Jul 2026 | 2.063.427.693 |
| Total cost Apr–Jul 2026 | 1.783.277.693 |
| **GP dilaporkan** | **257.650.000** |
| **GP seharusnya** | **280.150.000** |
| **Selisih** | **22.500.000** |

Persentase kesalahan: **8,03%** dari GP yang benar.

> ✅ Terverifikasi. Boleh dibawa ke Pak Indra.
> ⚠️ Tetap sebut bahwa ini dari berkas contoh Apr–Jul 2026, bukan seluruh
> pembukuan ISLI. Jangan melebihkan.
