# HANDOFF — IRISAN 3 LANJUTAN: CRUD MASTER DATA + RBAC + DETEKSI DUPLIKAT

> Ditulis otomatis 15/08/2026 ±16:00 WIB karena context window penuh.
> Baca dari atas ke bawah sebelum menyentuh apa pun. Baca juga
> `docs/HANDOFF-IRISAN-3.md` (masih sumber kebenaran D1–D11).

## STATUS VERIFIKASI DB (SUDAH DIJALANKAN SESI INI — hasil mentah)

Query 1 — `SELECT kode, keterangan FROM charge_codes ORDER BY kode;`
→ **42 baris** (bukan 43). `DELIVERY` & `MATERAI` SUDAH terhapus, tetapi
`FREIGHT` dan `OTHERS` masih ada dengan `aktif=0` (count 39 aktif + 3 nonaktif:
FREIGHT, OTHERS, + satu lagi). **JANGAN buru-buru menghapus** — user minta
hasil direview dulu. Cek ulang: `SELECT kode, aktif FROM charge_codes WHERE aktif = false;`

Query 2 — customers & vendors terbaru (LIMIT 15):
- customers: **30 baris**, created_at terkonsentrasi di 2026-02-09 (seed historis?)
  ditambah beberapa baru 2026-08-15 (PT Samudra Jaya, CV Mandiri Abadi,
  PT Global Nusantara, PT Inti Prima Logistik, PT Cahaya Abadi).
- vendors: **48 baris**, pola sama: mayoritas 2026-02-09 + 5 baru 2026-08-15
  (PT Pelayaran Samudra Timur, PT Trans Java Trucking, PT Dooring Express,
  PT EMKL Bahari, PT Jasa Logistik Utama).
- ports = 89, ship_lines = 25 (sudah ter-seed).

> ⚠️ Angka handoff lama (5 customer / 8 vendor) SUDAH BASI. DB nyata:
> **customers=30, vendors=48, ports=89, ship_lines=25, charge_codes=42 (39 aktif)**.

## YANG SUDAH DIKETAHUI DARI EKSPLORASI

1. **Skema** (`src/db/schema/index.ts`):
   - `customers`: id, nama, legalName, npwp, alamat, topHari, pph23Default, aktif, createdAt.
   - `vendors`: id, nama, legalName, npwp, vendorType, paymentTerm, paymentTermDays, pph23Default, aktif, createdAt.
   - `ports`: id, kode (unique), nama, negara, aktif.
   - `shipLines`: id, kode (unique), nama, aktif.
   - `chargeCodes`: PK `kode`, keterangan, nameId, defaultReimburse, butuhVendor,
     kategori (FIXED|OPSIONAL, default OPSIONAL), aktif, category, defaultLeg,
     isTaxable, isAtCostDefault, pph23Applicable, segmentScope + CHECK.
   - `auditLog`: id, userId, aksi, entitas, entitasId, sebelum (JSON), sesudah
     (JSON), alasan, createdAt. Append-only (REVOKE UPDATE/DELETE dari app_role).

2. **Session** (`src/lib/session/index.ts`):
   - `getCurrentUser()` → `{id, email, nama, role}` atau null (via Supabase auth + tabel users).
   - `requireUser()` → redirect ke /login kalau tidak ada.

3. **RBAC** (`docs/RBAC.md`):
   - Izin `masterdata.edit`: OWNER ✓, MANAGER ✓, STAFF ✗.
   - Pola wajib: satu pintu `assertCan(actor, "masterdata.edit", ...)` —
     DILARANG cek `role === "OWNER"` langsung; UI boleh sembunyikan tombol
     tapi server TETAP menolak.
   - "Setiap ✗ di tabel wajib punya test."
   - **BELUM DIBACA SESI INI: `src/lib/authz/index.ts`** — baca dulu untuk
     tahu bentuk `assertCan`/daftar izin yang sudah ada sebelum menambah.

4. **Stack & pola**: Next.js 15 (App Router), React 19, drizzle-orm 0.38,
   zod, next-safe-action (untuk server actions), radix-ui, tailwind.
   Test: vitest (unit/integration), playwright (e2e).
   `pnpm verify` = typecheck + lint + test + test:golden.

## RENCANA IMPLEMENTASI (BELUM ADA SATU PUN FILE DITULIS)

1. **`src/lib/authz/index.ts`** — pastikan izin `masterdata.edit` ada;
   kalau belum, tambah ke matriks izin (OWNER+MANAGER).
2. **`src/lib/master-data/`** (baru) — server actions (next-safe-action) atau
   route handlers untuk CRUD 5 entitas:
   - create / update / soft-delete (set `aktif=false`; DILARANG hapus permanen — D1).
   - Semua mutasi: cek `assertCan(user, "masterdata.edit")` dulu; tulis
     `audit_log` (aksi, entitas, entitasId, sebelum, sesudah JSON).
3. **Deteksi kemiripan nama** (`src/lib/master-data/similarity.ts`):
   - Normalisasi: lowercase, trim, collapse spasi, buang prefix PT./PT/CV./CV
     (pakai `\b`), buang tanda baca.
   - Skor: Dice coefficient bigram (implementasi sendiri, tanpa dependency baru).
   - Threshold default **0.75**; cek kasus MATEREE / MATEREE NUSANTARA /
     PT. MATEREE NUSANTARA UTAMA tetap memicu peringatan.
   - create/update customer & vendor: hitung kandidat mirip, kembalikan
     daftar peringatan — JANGAN menolak (keputusan D7). User boleh lanjut.
4. **UI**: halaman `/master-data` per entitas (list + form dialog). Sederhana
   dulu; RBAC gate di server action, tombol disembunyikan untuk STAFF.
5. **Test** (wajib ada):
   - `tests/unit/name-similarity.test.ts`: kasus MATEREE ≥ threshold;
     nama beda jelas < threshold.
   - `tests/integration/master-data-rbac.integration.test.ts` (atau unit
     dengan mock): STAFF ditolak create/edit/delete; OWNER & MANAGER boleh.
   - Soft delete: `aktif=false`, baris tetap ada, masuk audit_log.
   - Deteksi duplikat: peringatan muncul saat create nama mirip.
6. **JANGAN**: hapus baris DB, seed ulang, edit migrasi 0002, tebak
   NPWP/pph23/termin, ubah keputusan D1–D11.

## LANGKAH PERTAMA SESI BERIKUTNYA

1. Baca `src/lib/authz/index.ts` (belum sempat dibaca — context habis).
2. Lihat satu contoh test integration yang ada (`tests/integration/`) untuk
   pola koneksi DB test.
3. Ikuti RENCANA IMPLEMENTASI di atas urut 1→5.
4. Tutup dengan `pnpm verify`.

---
*Sesi 15/08/2026 — context habis setelah eksplorasi; belum ada kode ditulis.*
