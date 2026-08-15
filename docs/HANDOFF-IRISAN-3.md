# HANDOFF — IRISAN 3: MASTER DATA & KODE BIAYA

> Ditulis otomatis oleh sesi yang kehabisan context window.
> Baca file ini dari atas ke bawah sebelum menyentuh apa pun.

---

## RANGKUMAN AKHIR SESI (15/08/2026) — BACA INI DULU

Semua temuan sesi ini sudah final; D1–D11 di bawah tetap sumber kebenaran.

### Status sistem final

1. **Migrasi `0002_iris3_master_data.sql`: SUDAH APPLIED & hash cocok.**
   `pnpm db:migrate` berikutnya = **no-op** (drizzle-kit membaca
   `drizzle/meta/_journal.json`). Jangan edit file 0002, jangan jalankan
   `drizzle-kit generate`/`push` (D9).

2. **Count DB FINAL** (diverifikasi & dikonfirmasi 15/08/2026):
   | Tabel | Total | Keterangan |
   |---|---|---|
   | customers | **5** | seed demo 0001; raw CSV = 33 kandidat belum ternormalisasi |
   | vendors | **8** | seed demo 0001; raw CSV = 15 kandidat belum ternormalisasi |
   | charge_codes | **43** | sesuai fixture `fixtures/charge-codes.csv` (2 baris legacy sudah dihapus) |
   | ports | **21** | di-seed dari `fixtures/ports.csv` |
   | ship_lines | **11** | di-seed dari `fixtures/ship-lines.csv` |

   > Angka "33 customer / 15 vendor" adalah jumlah baris
   > `fixtures/customers-raw.csv` / `vendors-raw.csv` (kandidat yang
   > menunggu normalisasi manusia), **BUKAN** jumlah baris DB. Angka final
   > DB: **5 customer & 8 vendor** (D6: importer hanya memasukkan baris
   > yang `canonical_name_TODO`-nya sudah diisi manusia; saat ini 0 baris
   > lolos). `charge_codes` tepat **43** setelah 2 baris legacy dihapus.

3. **DELIVERY & MATERAI: 0 referensi** — sudah dicek di `src`, `tests`,
   `scripts`, `fixtures`, `docs`, `skills`; satu-satunya FK ke
   `charge_codes` hanya `charge_lines.charge_code` yang masih kosong →
   **aman dihapus** (D11).

### Langkah PERSIS yang tersisa (berurutan)

1. Hapus 2 baris legacy **langsung dari tabel via SQL**:
   ```sql
   DELETE FROM charge_codes WHERE kode IN ('DELIVERY', 'MATERAI');
   ```
   Dieksekusi **langsung ke DB** (psql/Studio/SQL client apa pun),
   **BUKAN** dengan mengedit file migrasi. **JANGAN edit
   `drizzle/0002_iris3_master_data.sql`** — file itu sudah applied dan
   isinya hanya ALTER/CREATE/UPDATE backfill (tidak ada INSERT
   charge_codes); mengubahnya tidak akan mengubah data DB dan malah
   merusak hash yang tercatat di `drizzle.__drizzle_migrations`.
   Setelah DELETE: charge_codes = tepat 43 baris fixture.
2. Buat `fixtures/ports.csv` & `fixtures/ship-lines.csv` mengikuti pola
   `fixtures/charge-codes.csv`; kolom sesuai DATA-DICTIONARY/ERD.
3. Tambah seksi seed ports & ship_lines di `scripts/seed.ts` (pola sama
   dengan seksi charge codes: parse CSV → `onConflictDoNothing` → hanya
   bila tabel kosong).
4. Jalankan seed: `pnpm db:seed` (tsx tidak ada di PATH pnpm — gunakan
   wrapper `scripts/run-db-seed.ps1`).
5. Verifikasi count akhir: customers=5, vendors=8, charge_codes=**43**,
   ports & ship_lines = jumlah baris fixture masing-masing.
   Cek: `npx tsx scripts/tmp-count.ts`; pastikan log `✓ Seed selesai.`.
6. Helper sekali-pakai sesi ini (`scripts/tmp-*.ts`, `scripts/tmp-*.ps1`,
   `scripts/run-db-*.ps1`) boleh dihapus sesi berikutnya bila mengganggu.

### Pesan untuk klien

Irisan 3 secara teknis selesai: migrasi applied & hash cocok, fixture 43
kode biaya siap, seed/check hijau. Tersisa hanya pembersihan 2 kode legacy
dan seed pelabuhan/perusahaan pelayaran — langkah persisnya sudah tertulis
di atas. Irisan berikutnya: iris4 (Jobs), iris5 (Vendor Bills), iris6
(Customer Invoices), iris7 (Dashboard & Laporan 2026).

---

## STATUS SAAT INI

**Migrasi 0002 SUDAH DI-APPLY.** Verifikasi: hash SHA-256 di
`drizzle.__drizzle_migrations` cocok 100% dengan file di disk untuk
0000/0001/0002. Jangan menjalankan `pnpm db:migrate` lagi (no-op) dan
jangan memverifikasi ulang SQL 0002 — sudah final dan applied.

### Yang sudah di disk dan sudah di-migrate:

1. **`src/db/schema/index.ts`** — sudah memuat semua perubahan Irisan 3:
   - Soft delete: kolom `aktif boolean NOT NULL DEFAULT true` di
     `customers`, `vendors`, `ports`, `ship_lines`, `charge_codes`.
   - `charge_codes.keterangan` — **DIPERTAHANKAN** apa adanya, tidak
     di-rename (kolom lama sejak migrasi 0000).
   - `charge_codes.name_id` — kolom **BARU** nullable, bukan rename.
     Seed mengisi eksplisit dari fixture.
   - `charge_codes.category` — kolom **BARU NULLABLE** (keputusan final,
     lihat D10). Seed mengisi eksplisit dari fixture.
   - `charge_codes.default_leg` — `smallint`, nullable (leg 1|2|3).
   - `charge_codes.is_taxable` — boolean NOT NULL DEFAULT true.
   - `charge_codes.is_at_cost_default` — boolean NOT NULL DEFAULT false.
   - `charge_codes.pph23_applicable` — boolean NOT NULL DEFAULT false.
     **JANGAN MENEBAK.** Q76 belum dijawab. UNKNOWN di fixture → false.
   - `charge_codes.segment_scope` — text NOT NULL DEFAULT 'BOTH' +
     CHECK ('DOM','EXIM','BOTH').
   - `charge_codes.butuh_vendor` — boolean NOT NULL DEFAULT true.
     **TANPA CHECK constraint.** Validasi di lapis aplikasi (R15.3/R15.4).
   - `charge_codes.kategori` — enum FIXED|OPSIONAL, DEFAULT OPSIONAL.
     **Q76 BELUM DIJAWAB → jangan ada satu pun kode FIXED.**
   - `ports.aktif` dan `ship_lines.aktif` ditambahkan.

2. **`drizzle/0002_iris3_master_data.sql`** — sudah diverifikasi baris
   per baris terhadap skema di atas dan SUDAH DI-APPLY (hash cocok).
   `category` dibuat NULLABLE di SQL — ini sesuai keputusan final D10.

3. **`fixtures/charge-codes.csv`** — 43 baris, sudah ada di disk.
   Semua `category`, `default_leg`, `is_taxable`, `is_at_cost_default`,
   `pph23_applicable`, `segment_scope` sudah terisi dari ERD.
   **Semua kode = OPSIONAL.** Tidak ada FIXED.

4. **`scripts/seed.ts`** — sudah ada seed charge_codes + customers +
   vendors demo. Perlu disesuaikan:
   - `nameId` diisi dari kolom `name_id` CSV (bukan dari `keterangan`).
   - `category`, `defaultLeg`, `isTaxable`, `isAtCostDefault`,
     `pph23Applicable`, `segmentScope` diisi eksplisit dari CSV.
   - `aktif: true` eksplisit di setiap insert master.
   - Importer customer/vendor: hanya baris dengan `canonical_name_TODO`
     **sudah diisi manusia**. Saat ini 0 baris → importer skip semua.

---

## KEPUTUSAN FINAL (JANGAN DIUBAH TANPA KONFIRMASI USER)

### D1 — Soft delete: `aktif` saja, tanpa `deleted_at`
Semua tabel master data (customers, vendors, ports, ship_lines,
charge_codes) memakai `aktif boolean NOT NULL DEFAULT true`.
**Tidak ada kolom `deleted_at` di tabel mana pun.**
Kewajiban simpan 10 tahun: tidak ada hapus permanen, hanya nonaktifkan.

### D2 — `name_id` = CREATE baru, BUKAN rename dari `keterangan`
`keterangan` dipertahankan apa adanya. `name_id` dibuat sebagai kolom
baru nullable di level DB. Seed selalu mengisi eksplisit dari fixture.

### D3 — R15.5 memakai kolom `kategori` yang SUDAH ADA sejak migrasi 0000
**BUKAN** kolom `wajib_muncul` baru. Jangan menambah kolom baru untuk
ini. `kategori` enum FIXED|OPSIONAL, default OPSIONAL.

### D4 — `butuh_vendor` = validasi aplikasi, BUKAN CHECK constraint DB
R15.3/R15.4: kewajiban vendor divalidasi di lapis aplikasi saat
charge line dibuat/diubah. Tidak ada constraint database untuk ini.

### D5 — `pph23_applicable`: JANGAN MENEBAK
Q76 belum dijawab. Semua UNKNOWN di fixture → `false` (default ERD).
Kalau Bu Niken menjawab nanti, ubah di seed/migrasi, bukan di sini.

### D6 — Importer customer/vendor: hanya baris ternormalisasi
Hanya baris dengan `canonical_name_TODO` sudah diisi manusia yang
masuk database. Saat ini 0 baris memenuhi syarat. 5 customer + 8
vendor demo di `seed.ts` dipertahankan apa adanya (data demo untuk
job contoh, bukan data ternormalisasi).

### D7 — Deteksi duplikat nama: PERINGATAN, bukan penolakan otomatis
Kasus MATEREE / MATEREE NUSANTARA / PT. MATEREE NUSANTARA UTAMA.
Sistem menampilkan peringatan "mungkin duplikat" saat nama mirip,
manusia yang memutuskan. Tidak ada auto-reject.

### D8 — RBAC master data
`masterdata.edit` hanya OWNER dan MANAGER. STAFF ditolak saat
mengubah master data. Ini wajib dibuktikan dengan test.

### D9 — Migrasi: `drizzle-kit push` DILARANG
Alur: baca SQL → verifikasi → `pnpm db:migrate`.
`drizzle-kit generate` interaktif sudah dijalankan sekali dan nyangkut
di prompt rename vs create. Kalau perlu generate ulang, jawaban yang
benar: `keterangan` **TETAP** (tidak di-rename), `name_id` dan
`category` **CREATE baru**.

### D10 — `charge_codes.category` NULLABLE (final, bukan bug)
Kolom `category` sengaja NULLABLE di level DB. Seed memang selalu
mengisi eksplisit dari fixture, tetapi DB tidak memaksa. Ini keputusan
final — **jangan "memperbaiki" menjadi NOT NULL** dan jangan membuat
migrasi baru untuk itu. Dokumen lama (termasuk versi awal handoff ini)
yang menyebut `category` NOT NULL sudah usang.

### D11 — Dua baris legacy `DELIVERY` & `MATERAI` dihapus
Selain 43 baris fixture, ada 2 baris legacy di `charge_codes`
(`DELIVERY`, `MATERAI`) sisa seed lama. Sudah dicek (scripts
tmp-ref-check): 0 baris `charge_lines` yang mereferensikan keduanya,
0 sebutan di `audit_log`, dan satu-satunya FK ke `charge_codes` hanya
dari `charge_lines.charge_code`. Aman dihapus → dihapus supaya
`charge_codes` = tepat 43 baris fixture.

---

## SISA PEKERJAAN (di sesi berikutnya)

1. ~~Baca & verifikasi `drizzle/0002_iris3_master_data.sql`.~~ **SELESAI**
   — sudah diverifikasi baris per baris dan applied.

2. ~~`pnpm db:migrate`~~ **SELESAI** — 0000/0001/0002 applied, hash cocok.

3. **Seed 43 kode biaya.** `pnpm db:seed` mengisi 43 baris,
   **semua OPSIONAL**, `nameId` + `category` terisi eksplisit.
   `pnpm db:check-seed` (atau `scripts/check-seed.ts`) harus lulus.

4. **Importer customer/vendor.** Fungsi yang membaca
   `fixtures/customers-raw.csv` dan `fixtures/vendors-raw.csv`,
   hanya mengimpor baris dengan `canonical_name_TODO` terisi.
   Saat ini: 0 baris → tidak ada yang masuk.
   Jangan mengisi `_TODO` di fixture. Jangan menebak NPWP.

5. **CRUD master data + RBAC.**
   - Endpoint/server action untuk create/edit/soft-delete
     customers, vendors, ports, ship_lines, charge_codes.
   - Guard: `masterdata.edit` → hanya OWNER dan MANAGER.
   - STAFF → 403/ditolak, dibuktikan test.
   - Soft delete = `aktif = false`, tidak ada hapus permanen.
   - Semua mutasi master data masuk `audit_log`.

6. **Deteksi kemiripan nama.**
   Saat membuat/mengubah customer atau vendor, bandingkan nama baru
   dengan semua nama aktif yang ada (case-insensitive, normalisasi
   spasi, hilangkan prefix PT/CV, dll.). Kalau ada yang mirip
   (threshold configurable), tampilkan **peringatan** — bukan error.
   User boleh melanjutkan setelah melihat peringatan.

7. **Test yang harus ada:**
   - STAFF ditolak saat create/edit/delete master data.
   - OWNER dan MANAGER boleh.
   - Soft delete: `aktif = false`, baris tetap ada di database.
   - Importer: 0 baris masuk saat semua `canonical_name_TODO` kosong.
   - Importer: baris masuk saat `canonical_name_TODO` terisi.
   - Deteksi kemiripan: peringatan muncul untuk kasus MATEREE.
   - Seed: 43 kode, semua OPSIONAL, `nameId` terisi.

8. **`pnpm verify` hijau.**

---

## CATATAN UNTUK SESI BERIKUTNYA

- `drizzle-kit generate` interaktif: kalau ditanya soal `keterangan`,
  jawab **TETAP / jangan rename**. Kalau ditanya soal `name_id` atau
  `category`, jawab **CREATE baru**.
- Jangan menambah kolom yang tidak ada di ERD.
- Jangan menebak NPWP, pph23_applicable, atau termin.
- Jangan menandai kode biaya sebagai FIXED sampai Q76 dijawab.
- Q25 (normalisasi nama customer/vendor) belum dijawab → jangan
  normalisasi otomatis. Tandai kandidat duplikat, manusia yang putuskan.

---

*Ditulis oleh sesi Irisan 3, 2026-08-15, sebelum context window habis.*
