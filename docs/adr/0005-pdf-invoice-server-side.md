# ADR-0005: Render PDF Invoice di Server

- **Status:** Accepted
- **Tanggal:** 2026-08-13

## Konteks

Invoice adalah dokumen resmi bermaterai yang dikirim ke customer dan dipakai
sebagai dasar perpajakan. Dua sampel asli menunjukkan kebutuhan:

- Kop surat + logo ISLI
- Tabel rincian charge
- Blok pajak: SUB TOTAL, DPP, PPN 1,1%, PPH 23 2%, GRAND TOTAL
- **Terbilang** dalam bahasa Indonesia
- Informasi bank: DANAMON, KCP HARAPAN INDAH - BEKASI, 003707391938
- Blok tanda tangan
- Invoice Reimburse terpisah tanpa PPN

## Keputusan

1. PDF di-render **di server**, tidak pernah di browser.
2. Memakai **React-PDF** (`@react-pdf/renderer`).
3. Angka pada PDF dibaca dari **kolom yang sudah dibekukan** di
   `customer_invoice`, bukan dihitung ulang saat render.
4. PDF hasil disimpan (atau di-render deterministik dari data beku) agar cetak
   ulang selalu identik.
5. Terbilang dihasilkan `domain/terbilang/` dan **disimpan** di kolom, bukan
   dihitung saat render.

## Alasan

1. **Konsistensi.** Render di browser berbeda-beda antar mesin dan versi.
   Dokumen pajak tidak boleh begitu.
2. **Angka beku.** Kalau PDF menghitung ulang, perubahan tarif di masa depan
   akan mengubah invoice lama saat dicetak ulang. Itu pelanggaran serius.
3. **Bisa diuji.** Golden test bisa membandingkan angka hasil sistem dengan
   invoice asli tanpa menjalankan browser.
4. React-PDF memakai JSX sehingga agent AI relatif akurat menulisnya, dan
   layout-nya deterministik.

## Yang ditolak

| Alternatif | Alasan |
|---|---|
| Puppeteer HTML→PDF | Butuh Chromium di server, lambat, rentan beda versi |
| `window.print()` | Hasil beda antar browser; tidak bisa diuji |
| Template DOCX + konversi | Rantai konversi rapuh; sulit di-diff |
| Layanan PDF pihak ketiga | Data invoice keluar dari kendali; biaya berulang |

## Konsekuensi

- Perlu font yang mendukung karakter Indonesia, di-bundle di repo.
- Layout PDF butuh iterasi manual di awal. Sekali jadi, stabil.
- **Uji banding wajib:** output untuk data Materee dan Diametral harus
  menghasilkan angka identik dengan invoice asli sebelum fitur dianggap selesai.
