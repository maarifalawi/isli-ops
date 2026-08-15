# HANDOFF IRISAN 3 CRUD — SESI B (status per 15 Agu 2026, ~18:28 WIB)

> Sesi implementasi dimulai (RENCANA di `docs/RENCANA-IRISAN-3-CRUD.md`).
> Baca file INI dulu, baru RENCANA. Sesi sebelumnya (A) hanya menghasilkan
> RENCANA + verifikasi prasyarat; sesi B mulai eksekusi §10.

## Yang sudah di-commit (2/5 langkah)

| Commit | Isi |
|---|---|
| `bb7baad` iris3-crud-01 | `src/lib/audit/index.ts` (writeAudit + AuditEntity + AuditAction) + `tests/unit/audit.test.ts` (8 test: append-only, tolak DELETE, tolak UPDATE, payload jsonb) |
| `7c5a2ab` iris3-crud-02 | `src/lib/similarity/index.ts` (normalisasiTeks, jarakLevenshtein, similaritasLevenshtein, mirip ambang 0.85, cariKandidatMirip) + `tests/unit/similarity.test.ts` (11 test) |

## ⚠ WAJIB pertama di sesi C: verifikasi test yang BELUM dijalankan

Shell `powershell -Command` di sesi ini TIDAK menemukan `pnpm` di PATH —
commit `iris3-crud-02` dibuat TANPA menjalankan test. Jalankan manual:

```powershell
pnpm vitest run tests/unit/similarity.test.ts tests/unit/audit.test.ts
```

Jika ada yang merah, perbaiki DULU sebelum lanjut.

## Sisa langkah (RENCANA §10.3–§10.5)

- §10.3 server actions CRUD 5 entitas + test integrasi → commit iris3-crud-03
  - Baca `src/lib/authz/index.ts` (requireLogin/requireAdmin — BELUM pernah dibaca penuh di sesi A/B).
- §10.4 komponen + halaman `/master/**` → commit iris3-crud-04
- §10.5 e2e master-crud.spec.ts + `pnpm verify` + handoff akhir → commit iris3-crud-05

## Keputusan penting yang sudah final (jangan bahas ulang)

1. **TIDAK ada migrasi baru** — prasyarat skema sudah lengkap di drizzle 0000/0001/0002 (verified via search_files di sesi A).
2. **REVOKE di 0000 (baris 197, 203, 217, 223) diabaikan**: role `app_role` TIDAK ADA di repo ini (grep `app_role` hanya kena 0000 itu sendiri; 0001/0002 tidak menyebutnya). Catat di OPEN-QUESTIONS.md saat §10.5.
3. **audit_log sudah ada** di drizzle 0001 (kolom: actor, entity, entity_id, action, payload jsonb, logged_at) — writeAudit tinggal pakai, tanpa ALTER.
4. Script DB via `node --experimental-strip-types --env-file=.env.local` (lihat `scripts/run-db-seed.ps1`). `pgcrypto` untuk `gen_random_uuid()` sudah di-extension pgcrypto (0000 baris ~5) — cek sebelum pakai.
5. Test DB pakai koneksi langsung (`createDb(drizzleDb)`) seperti `tests/integration/job-sequence.integration.test.ts`.

## Fakta cepat yang sering dibutuhkan

- Entitas & aturan unik (RENCANA §2): customers/vendors = kode unik case-insensitive; ports/ship_lines/charge_codes = tanpa kode.
- Soft delete: `is_active=false`, TIDAK hard delete (DOMAIN-RULES D-21).
- RBAC: 3 role (admin/ops/finance); hanya admin yang create/update/inactivate (RBAC.md §4).
- Route: `/master/customers|vendors|ports/ship-lines|charge-codes`.
- `pnpm verify` = typecheck + biome + test:all (package.json).
