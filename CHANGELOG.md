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


## Irisan 5 - State Machine Job + Approval L1 & Final + Guard (2026-08-17)

- Migrasi `0005_iris5_state_machine`: enum `job_status` +UNLOCK_REQUESTED;
  `jobs.approval_cycle` (NOT NULL DEFAULT 1).
- Modul baru `src/lib/state-machine/`: tabel transisi murni (9 transisi,
  persis STATE-MACHINE.md) + predikat isFinal/isLocked/isEditable + service
  transisi 8 aksi (submit/cancel/approve_l1/reject/approve_final/
  request_unlock/unlock_granted/unlock_denied) dengan row-lock +
  guard status-lama (anti-race), approval cycle reset (R6.2), berita acara
  wajib (R6.4), J-INV-3/4 (unlock diblokir invoice terbit).
- Authz +3 izin: job:cancel, job:reject, job:request_unlock (Q-IRIS5-4).
- Audit +8 aksi transisi (alasan wajib REJECT/REQUEST_UNLOCK/UNLOCK_DENIED).
- Guard 4b: create/update/hapus charge line kini cek isEditable(DRAFT) +
  scope STAFF maker_id. Guard 4e: cekFinal mendelegasikan ke isLocked
  (FINAL|DIBATALKAN) - Q-IRIS5-8.
- Test: unit state-machine 10, integrasi 28 (alur penuh, cycle, race paralel,
  berita acara, DIBATALKAN terminal). Semua keputusan Q-IRIS5-1..8 terkunci test.
- Docs: STATE-MACHINE.md (mapping nama + J-INV-7/8 + hapus stale reallocate),
  RBAC.md, ERD.md, OPEN-QUESTIONS.md.
