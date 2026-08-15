# HANDOFF IRISAN 3 CRUD — SESI C (status per 15 Agu 2026, ~18:48 WIB)

> §10.1–§10.3 SELESAI & COMMITED, test hijau.
> Baca file INI dulu, baru `docs/RENCANA-IRISAN-3-CRUD.md`.
> Commit yang sudah ada: `bb7baad` iris3-crud-01 (audit),
> `7c5a2ab` iris3-crud-02 (similarity), `2034981` iris3-crud-03 (master-data).

## Status sesi D (mulai dari sini)

§10.1–§10.3 hijau: audit (6 unit), similarity (10 unit), master-data (8 integrasi).
Jalankan ulang bila perlu: `npx vitest run tests/unit/audit.test.ts tests/unit/similarity.test.ts tests/integration/master-data.integration.test.ts`
(catatan: `pnpm` tidak ada di PATH shell non-interaktif; pakai `npx`).
Fix yang sudah masuk commit: `topHari: input.topHari ?? 30`,
`pph23Default: input.pph23Default ?? false` (kolom NOT NULL warisan Irisan-1).

## Yang ditulis di sesi C (commit `2034981`)

| File | Isi |
|---|---|
| `src/lib/master-data/index.ts` | Logika CRUD 5 entitas (RENCANA §4/§6): buat/ubah Customer, Vendor, Port, ShipLine, ubahChargeCode (kode immutable), ubahStatusAktif (soft delete, alasan wajib utk NONAKTIFKAN). Semua: assertCan(role,"master:manage") → tx: snapshot → mutasi → writeAudit TEPAT 1 baris. Pembacaan: daftarCustomer/Vendor/Port/ShipLine/ChargeCode. |
| `tests/integration/master-data.integration.test.ts` | 8 test integrasi vs DB asli (pola job-sequence.integration.test.ts): RBAC STAFF ditolak, duplikat case-insensitive, similaritas miripDengan, kode immutable, nonaktif tanpa alasan ditolak, audit TEPAT 1 baris per mutasi. |

Catatan implementasi penting:
- `writeAudit(tx,...)` menerima tx (transaksi) — modul audit murni DB, tanpa Next.
- `assertCan`/`AuthorizationError` dari `src/lib/authz/index.ts`; STAFF tidak punya `master:manage`.
- charge_codes PK TEXT → `entitas_id` audit diisi `null`, kode terekam di payload JSON + field alasan.
- Port/ShipLine: tanpa nonaktifkan (RENCANA §6), hanya buat/ubah.

## Sisa langkah (RENCANA §10.4–§10.5)

- §10.4 komponen + halaman `/master/customers|vendors|ports|ship-lines|charge-codes`
  (server components + server actions yang memanggil `src/lib/master-data`) → commit iris3-crud-04.
- §10.5 e2e `tests/e2e/master-crud.spec.ts` + `pnpm verify` + catat isu REVOKE
  app_role di OPEN-QUESTIONS.md → commit iris3-crud-05 + handoff akhir.

## Keputusan final (jangan bahas ulang)

1. TIDAK ada migrasi baru — skema lengkap di drizzle 0000/0001/0002.
2. REVOKE `app_role` di 0000 diabaikan (role tidak ada di repo).
3. audit_log (0001): actor/entity/entity_id/action/payload jsonb/logged_at; writeAudit sudah dipakai iris3-crud-01.
4. Test DB: koneksi langsung via `createDb(drizzleDb)` seperti test integrasi job-sequence.
5. `pnpm verify` = typecheck + biome + test:all.
