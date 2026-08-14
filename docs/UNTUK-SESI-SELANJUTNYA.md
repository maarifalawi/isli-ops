# UNTUK-SESI-SELANJUTNYA.md

> Dokumen siap-pakai untuk menutup sisa "Gerbang 0" (`BUILD-PLAN.md`).
> Semua isian di sini **usulan berdasarkan bukti di data**, BUKAN jawaban final
> -- ditandai jelas per bagian. Agent tidak mengisi NPWP atau nama resmi karena
> itu wajib dari daftar resmi Bu Niken (lihat `fixtures/README.md`), bukan
> tebakan dari data mentah.

---

## 1. Untuk Pak Indra -- sisa ADR-0007

Poin 1 (NETT memasukkan PPN ke margin) sudah dijawab: **disengaja**.
Satu poin tersisa:

> Di job sheet, `CHARGE LOLO 645.000` (pendapatan reimburse) tidak masuk
> hitungan GP, tapi `THC LOLO JKT 4.805.000` (biaya reimburse) masuk penuh ke
> biaya. Ini bikin GP kelihatan lebih kecil dari yang sebenarnya kalau ada
> reimburse. **Mau dibiarkan seperti itu, atau reimburse dikeluarkan dari
> hitungan GP di kedua sisi (revenue maupun cost) supaya konsisten?**

Setelah dijawab, ADR-0007 ditutup `Accepted` dan Gerbang 0 tinggal 5 item.

---

## 2. Untuk Pak Indra -- presentasi RECONCILIATION-REPORT.md

Dokumen `docs/RECONCILIATION-REPORT.md` sudah lengkap (8 temuan, termasuk bug
GP 8,03% dan kasus dobel bayar 01A/01B). Tinggal dijadwalkan sesi singkat untuk
diperlihatkan dan disetujui sebagai dasar angka golden test.

---

## 3. Untuk Bu Niken -- validasi `charge-codes.csv` (43 kode)

Tabel di bawah usulan kategori **FIXED/OPSIONAL** (R15.5) dan **butuh vendor**
(R15.3), disusun dari bukti yang sudah ketemu di data + kutipan transkrip.
Tinggal dikoreksi kolom yang salah, bukan diisi dari nol.

| Kode | Nama | Usulan kategori | Usulan butuh vendor | Alasan usulan |
|---|---|---|---|---|
| OF | Ocean Freight | FIXED | Ya | disebut eksplisit di transkrip 2 |
| AF | Air Freight | FIXED | Ya | setara OF untuk jalur udara |
| BL | Bill of Lading | FIXED | Ya | disebut eksplisit ("BL") |
| TELEX FEE | Telex Release Fee | OPSIONAL | Ya | hanya EXIM tertentu |
| LSS | Low Sulphur Surcharge | FIXED | Ya | disebut eksplisit ("LSS") |
| TOESLAG | Surcharge Pelayaran | OPSIONAL | Ya | tidak disebut di transkrip |
| ADD FREIGHT | Additional Freight | OPSIONAL | Ya | disebut eksplisit sebagai contoh OPSIONAL |
| APBS | Alur Pelayaran Barat Surabaya | OPSIONAL | Ya | retribusi, tidak semua rute |
| THC | Terminal Handling Charge | FIXED | Ya | disebut eksplisit ("THC") |
| THC LOLO | THC Lift On Lift Off | OPSIONAL | Ya | varian THC, tidak semua job |
| THC TRANSIT | THC Transit | OPSIONAL | Ya | hanya job transit |
| THD | Terminal Handling Destination | OPSIONAL | Ya | tidak disebut eksplisit |
| LOLO | Lift On Lift Off | OPSIONAL | Ya | terbukti reimburse, bukan biaya rutin |
| STORDEM | Storage & Demurrage | OPSIONAL | Ya | hanya kalau ada keterlambatan |
| CLEANING | Pembersihan Container | OPSIONAL | Ya | tidak selalu terjadi |
| SEGEL | Segel Container | FIXED | Ya | disebut eksplisit ("segel") |
| SEAL | Seal Container | ⚠️ cek dulu -- diduga sama dengan SEGEL | Ya | perlu dipastikan bukan duplikat |
| PENITIPAN CONTAINER | Penitipan Container | OPSIONAL | Ya | tidak selalu terjadi |
| SPREADER | Spreader | OPSIONAL | Ya | tidak selalu terjadi |
| STRAP | Strapping | OPSIONAL | Ya | tidak selalu terjadi |
| DO | Delivery Order | OPSIONAL | Ya | tidak disebut eksplisit sebagai FIXED |
| TRUCKING | Trucking | FIXED | Ya | disebut eksplisit ("trucking") |
| CHARGE TRUCKING | Charge Trucking | ⚠️ cek dulu -- diduga sama dengan TRUCKING | Ya | perlu dipastikan bukan duplikat |
| DOORING | Dooring | FIXED | Ya | disebut eksplisit ("dooring") |
| ADD COST PICK UP EMPTY | Biaya Ambil Container Kosong | OPSIONAL | Ya | ad-hoc |
| UM SUPIR | Uang Makan Supir | OPSIONAL | **Tidak** | disebut eksplisit sebagai contoh OPSIONAL, biaya internal |
| BIAYA TIMBANG | Biaya Jembatan Timbang | OPSIONAL | **Tidak** | disebut eksplisit sebagai contoh OPSIONAL |
| PEB | Pemberitahuan Ekspor Barang | FIXED | Ya | wajib untuk semua job ekspor |
| PIB | Pemberitahuan Impor Barang | FIXED | Ya | wajib untuk semua job impor |
| COO | Certificate of Origin | OPSIONAL | Ya | tidak semua job minta COO |
| PPFTZ | Dokumen PPFTZ | OPSIONAL | Ya | khusus Batam |
| DOC | Biaya Dokumen | OPSIONAL | Ya | tidak spesifik |
| INSURANCE | Asuransi Muatan | OPSIONAL | Ya | at-cost, tidak semua job |
| HANDLING | Jasa Handling | OPSIONAL | **Tidak** | pendapatan jasa ISLI sendiri |
| HANDLING OPS FREELANCE | Upah Ops Freelance | OPSIONAL | **Tidak** | disebut eksplisit sebagai contoh tanpa vendor |
| ADMINISTRASI | Biaya Administrasi | OPSIONAL | **Tidak** | disebut eksplisit sebagai contoh tanpa vendor |
| MATERAI PELAYARAN | Materai Cadangan Pelayaran | OPSIONAL | **Tidak** | disebut eksplisit sebagai contoh tanpa vendor |
| MATERAI INVOICING | Materai Cadangan Invoicing | OPSIONAL | **Tidak** | disebut eksplisit sebagai contoh tanpa vendor |
| DELIVERY CHARGE DOC | Ongkir Dokumen | OPSIONAL | Ya | tidak selalu terjadi |
| DELIVERY CHARGE INV | Ongkir Invoice | OPSIONAL | Ya | tidak selalu terjadi |
| REIMBURSEMENT STORAGE | At Cost Reimbursement Storage | OPSIONAL | Ya | at-cost, tidak rutin |
| REIMBURSEMENT LIFT ON | At Cost Reimbursement Lift On | OPSIONAL | Ya | at-cost, tidak rutin |
| REIMBURSE INAP | Reimburse Inap | OPSIONAL | Ya | at-cost, tidak rutin |

> ⚠️ Ini **usulan agent**, bukan keputusan. Kolom `pph23_applicable` di
> `charge-codes.csv` TETAP `UNKNOWN` dan tidak diisi -- itu bukan lagi
> pertanyaan wajib jawab (lihat Q04, sudah jadi kolom manual per invoice),
> jadi tidak perlu diisi di level kode biaya sama sekali.

---

## 4. Untuk Bu Niken -- normalisasi nama customer & vendor

Agent **tidak** mengisi kolom `canonical_name_TODO` atau `npwp_TODO` di
`fixtures/customers-raw.csv` / `vendors-raw.csv` -- itu wajib dari daftar
resmi, bukan tebakan. Tapi ini kelompok nama yang **kemungkinan** entitas yang
sama, siap dikonfirmasi/dikoreksi:

**Customer:**
| Kemungkinan sama | Nama-nama yang muncul |
|---|---|
| Materee? | `MATEREE`, `MATEREE NUSANTARA` |

**Vendor:** tidak ada indikasi variasi nama yang jelas di 11 baris
`vendors-raw.csv` -- semua kelihatan berbeda entitas (SPIL, LKA, ICON,
SCANSHIPPPING, TEMAS, CTP, MERATUS, SINDO, PULAU LAUT, ONE, CNC).

**Yang tetap wajib diisi Bu Niken untuk 11 customer + 11 vendor:**
- `canonical_name_TODO` (nama resmi/legal)
- `npwp_TODO`
- `address_TODO` (customer) / `payment_term_TODO` (vendor)
- `default_top_TODO` (customer)

---

## 5. Untuk Pak Indra -- identitas ISLI

Untuk kop invoice, wajib diterima:
- NPWP ISLI
- Alamat resmi
- Kontak (telepon/email) yang tercetak di invoice

(`docs/IDENTITAS-ISLI.md` sudah punya sebagian dari metadata dokumen lama --
tinggal dikonfirmasi masih berlaku atau ada yang berubah.)

---

## 6. Untuk Pak Indra -- persetujuan tertulis Scope Phase 1

Usul kalimat persetujuan singkat (tinggal di-"ya"-kan atau dikoreksi):

> *"Saya, Indra, menyetujui scope Phase 1 sistem ISLI Ops sebagaimana
> dijabarkan di `docs/PRD.md` dan `docs/PROPOSAL-PHASES.md` per 13 Agustus
> 2026: job costing, approval dua tingkat, invoice customer & vendor (+
> addendum), anti-dobel-bayar, realokasi biaya dengan approval, laporan
> operasional bulanan. Integrasi Accurate dan fitur di luar daftar ini masuk
> fase selanjutnya, bukan Phase 1."*

---

## Ringkasan status pengiriman

| Item | Ke | Siap dikirim? |
|---|---|---|
| 1. Sisa ADR-0007 | INDRA | ✅ siap |
| 2. Presentasi reconciliation | INDRA | ✅ dokumennya siap, tinggal jadwal |
| 3. Validasi charge-codes | NIKEN | ✅ tabel usulan siap dikoreksi |
| 4. Normalisasi customer/vendor | NIKEN | ✅ template siap diisi |
| 5. Identitas ISLI | INDRA | ✅ siap dikonfirmasi |
| 6. Persetujuan Scope Phase 1 | INDRA | ✅ draft siap ditandatangani/disetujui |
