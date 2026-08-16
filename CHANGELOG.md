# Changelog

## [Unreleased]

### Irisan 3 — Master data + CRUD + RBAC + deteksi kemiripan + audit (ditutup 16 Agu 2026)

- **Entitas (5):** Customer, Vendor, Port, Ship Line, Charge Code — skema +
  migrasi `drizzle/0002_iris3_master_data.sql`, termasuk kolom
  `charge_codes.kategori` (FIXED | OPSIONAL, default OPSIONAL untuk kode baru).
- **Data awal (seed):** 89 port, 25 ship line, 42 charge code (39 aktif),
  30 customer, 48 vendor.
- **CRUD:** hub `/master` + 5 halaman entitas (buat / ubah / nonaktifkan);
  nonaktifkan = soft delete dengan alasan wajib (tidak ada hapus permanen);
  kode charge code immutable. 15 server action di `src/lib/actions/master.ts`.
- **RBAC:** otorisasi master data satu pintu via `assertCan(user.role, "master:manage")`
  (`src/lib/authz`). Izin `master:manage` dimiliki role OWNER dan MANAGER;
  STAFF ditolak (read-only). Role sah hanya OWNER/MANAGER/STAFF — TIDAK ADA
  role bernama ADMIN di sistem ini. Dijaga di server action dan UI.
- **Deteksi kemiripan:** similaritas Levenshtein ternormalisasi (ambang 0,85)
  saat input nama customer/vendor — memberi peringatan, tidak menolak.
- **Audit:** `audit_log` append-only, tepat 1 baris per mutasi
  (snapshot JSON sebelum/sesudah + alasan), ditulis dalam transaksi yang sama.
- **Test:** 43 test baru terkait Irisan 3 — 6 unit audit
  (`tests/unit/audit.test.ts`), 25 unit similarity
  (`tests/unit/similarity.test.ts`), 9 integrasi master-data
  (`tests/integration/master-data.integration.test.ts`), 3 e2e
  (`tests/e2e/master-crud.spec.ts`). Hasil literal `pnpm verify`
  (dijalankan ulang 16 Agu 2026): typecheck lolos, lint (biome) lolos,
  vitest `Test Files 15 passed (15)` / `Tests 163 passed (163)`,
  dan `test:golden` exit 0 dengan `Test Files 3 skipped (3)` /
  `Tests 28 skipped (28)` (golden memang dieksklusi dari gate via
  `--testNamePattern=''`). Playwright TIDAK termasuk gate verify;
  e2e master-crud terakhir dijalankan terpisah: 3/3 lolos
  (lihat `docs/HANDOFF-IRISAN-3-CRUD-SESID.md`).
- **Catatan:** REVOKE `app_role` di level database TIDAK dibuat — status
  menunggu keputusan klien (lihat `docs/OPEN-QUESTIONS.md`).

### Phase 0 - Discovery
- Audit lengkap 7 dokumen klien, 9 temuan tercatat
- 75 job Apr-Jul 2026 diekstrak jadi golden fixtures
- 43 charge code diidentifikasi
- 34 pertanyaan discovery disusun (12 blocker)
- 7 ADR (5 accepted, 2 proposed menunggu keputusan klien)
- Identitas legal ISLI diekstrak dari kop surat (NPWP masih kosong)
