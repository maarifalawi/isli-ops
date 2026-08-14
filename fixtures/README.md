# Fixtures

Data uji yang diekstrak dari dokumen asli ISLI.

> **Status: ASLI dan TERVERIFIKASI** — Q37 dijawab klien 13 Agu 2026, tidak ada
> baris yang dihapus sebelum berkas diserahkan. Diperkuat pemeriksaan struktur
> berkas (8 sheet, termasuk 2 yang tersembunyi).
>
> **Batasan:** ini **contoh** April–Juli 2026, bukan seluruh job ISLI.
> Baca `docs/SOURCE-PROVENANCE.md`.

---

## Angka pembanding yang sah

```
Total selling Apr-Jul 2026   2.063.427.693
Total cost   Apr-Jul 2026    1.783.277.693
GP seharusnya                  280.150.000
GP dilaporkan Excel klien      257.650.000
Selisih (bug F19)               22.500.000   <- 8,03%
```

✅ Boleh dipakai untuk golden test **dan** untuk proposal ke Pak Indra.
⚠️ Selalu sebut cakupannya: "dari berkas contoh April–Juli 2026".

---

## Berkas

| Berkas | Baris | Isi |
|---|---:|---|
| `golden-jobs.csv` | 75 | Job Apr–Jul 2026, 32 kolom |
| `golden-job-reimburse.csv` | 8 | Job dengan baris at-cost |
| `charge-codes.csv` | 43 | Master charge code |
| `customers-raw.csv` | 11 | Customer mentah, NPWP kosong |
| `vendors-raw.csv` | 11 | Vendor mentah, termin kosong |

---

## 🔴 Berkas induk yang BELUM kita punya

External link di summary report mengarah ke:

```
D:\ISLI\SO 2026\SO BULAN APRIL 2026.xlsx
```

Satu berkas per **bulan**, satu sheet per **job** (`04-001` … `04-011`).

| Bulan | Tertaut? |
|---|---|
| April | ✅ ya |
| Mei, Juni, Juli | ❌ tidak — nilai diketik manual |

**Minta seluruh `SO BULAN *.xlsx` ke Fairol (Q41).** Itu sumber costing per job
yang sesungguhnya. 75 job di sini adalah rekap tingkat atas, **bukan** rincian
per baris biaya. Tanpa berkas induk, migrasi historis tidak akan akurat.

---

## Dua tingkat golden test

| Tingkat | Isi | Status |
|---|---|---|
| **A — Struktural** | penomoran, tabrakan, charge code, urutan pajak, kombinasi leg | ✅ wajib hijau |
| **B — Rekonsiliasi** | total GP per bulan & segmen | ✅ aktif (Q37 terjawab) |

Satu test sengaja merah: `invoice-diametral` selisih Rp 1 (**Q05**).

---

## Yang belum lengkap

### `customers-raw.csv` dan `vendors-raw.csv`

Kolom berakhiran `_TODO` **belum diisi** dan tidak boleh ditebak:

```
canonical_name_TODO    nama resmi — ada 3 variasi untuk Materee
npwp_TODO              wajib untuk invoice
default_top_TODO       termin pembayaran
pph23_dipotong_TODO    🔴 aturannya belum diketahui (Q04)
```

Isi dari daftar resmi Bu Niken, bukan dari hasil ekstraksi.

### Variasi nama yang belum dipastikan

```
MATEREE / MATEREE NUSANTARA / PT. MATEREE NUSANTARA UTAMA
METTA LINTAS / META LINTAS
```

### `charge-codes.csv`

`pph23_applicable` hampir semuanya `UNKNOWN`. **Disengaja.** Jangan diubah jadi
`TRUE`/`FALSE` tanpa jawaban Bu Niken (Q04).

Perlu dipastikan beda atau sama: `TRUCKING` vs `CHARGE TRUCKING`,
`SEGEL` vs `SEAL`.

### Kas belum termodelkan

Sheet tersembunyi `Sheet1` berisi dropping Rp 200 juta dan pemakaian
Rp 210,1 juta — **lebih pakai Rp 10,1 juta**, bercampur cicilan mobil dan petty
cash. Belum ada fixture untuk ini karena scope-nya belum diputuskan
(Q43–Q47).

---

## Aturan memakai fixtures

1. **Jangan ubah angka** supaya test hijau. Baca `workflows/verify-golden.md`.
2. **Jangan isi kolom `_TODO`** dengan tebakan.
3. Selalu sebut cakupan "contoh Apr–Jul 2026" saat mengutip total.
4. Kalau dapat berkas `SO BULAN *.xlsx` → **tambahkan sebagai berkas baru**,
   jangan timpa yang ini. Yang ini jejak apa yang kita terima 13 Agu 2026.
