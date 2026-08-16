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

### Basis UI untuk §10.4 (sudah diverifikasi)

- `src/app` masih berisi: `layout.tsx`, `page.tsx`, `globals.css`, `login/`,
  `logout/` — BELUM ada folder `master/`.
- `layout.tsx`: header "ISLI Ops" + badge "Irisan 0", main `max-w-[1280px] px-4 py-6`,
  class: `border-hairline bg-canvas text-ink-48 text-section text-label`
  (token DESIGN-SYSTEM di tailwind.config.ts).
- Auth: `requireUser()` dari `src/lib/session/index.ts` (redirect /login?error=…).
  Guard aksi: `assertCan(user.role, "master:manage")`; STAFF harus ditolak.
- Login e2e: pola `tests/e2e/auth.spec.ts`; user OWNER ada via Supabase Auth
  (lihat `scripts/create-supabase-users.md` + seed users).
- Uang/format: util di `src/lib/money`; jangan re-format manual.

## Keputusan final (jangan bahas ulang)

1. TIDAK ada migrasi baru — skema lengkap di drizzle 0000/0001/0002.
2. REVOKE `app_role` di 0000 diabaikan (role tidak ada di repo).
3. audit_log (0000): id/user_id/aksi/entitas/entitas_id (uuid NULLABLE)/sebelum/sesudah/alasan/created_at; writeAudit sudah dipakai iris3-crud-01.
4. Test DB: koneksi langsung via `createDb(drizzleDb)` seperti test integrasi job-sequence.
5. `pnpm verify` = typecheck + biome + test:all.

## Jawaban laporan (diverifikasi 15 Agu 2026 ~18:56 WIB, berbasis kode & uji aktual)

### Q1: "MATEREE" bisa match "PT. MATEREE NUSANTARA UTAMA"?

TIDAK otomatis — tapi skornya jauh lebih rendah dari ambang, jadi aman:
uji aktual `tests/unit/similarity-materee.test.ts` (npx vitest, hijau):

- A="MATEREE" vs B="MATEREE NUSANTARA UTAMA" → similaritas 7/23 ≈ **0,30** → mirip=false
- A vs C="PT. MATEREE NUSANTARA UTAMA" → 7/26 ≈ **0,27** → mirip=false
- B vs C → 23/26 ≈ **0,88** → mirip=**true**

Algoritma final `src/lib/similarity/index.ts` (commit 7c5a2ab):
`similaritasLevenshtein(a,b) = (max(len) − lev(a,b)) / max(len)` atas string
ternormalisasi (huruf kecil, di-trim, non-huruf-angka → spasi, spasi ganda
dirapatkan). `mirip()` = skor ≥ **AMBANG_SIMILARITAS = 0,85**.
Implikasi UI: input "MATEREE" tidak memblokir/memunculkan "MATEREE NUSANTARA
UTAMA" sebagai duplikat (0,30/0,27 < 0,85), tetapi variasi seperti "PT MATEREE
NUSANTARA UTAMA" vs "PT. MATEREE NUSANTARA UTAMA" (hanya beda titik) akan
terdeteksi mirip. Jika bisnis ingin nama-pendek ("MATEREE") ikut dianggap sama,
itu KEBIJAKAN baru: perlu tambahan pengecekan `includes`/substring — jangan
ubah ambang tanpa keputusan eksplisit.

### Q2: Kolom entitas_id di audit_log

Kolom `entitas_id` di tabel `audit_log` bertipe `uuid` dan **NULLABLE**
(DDL 0000: `"entitas_id" uuid,` — tanpa NOT NULL; ada `idx_audit_entitas`
pada `(entitas, entitas_id)`). Ini disengaja karena 4 entitas (customers,
vendors, ports, ship_lines) PK-nya uuid, sedangkan charge_codes PK-nya TEXT
(kode). Konvensi `writeAudit` (src/lib/audit/index.ts, commit bb7baad):
- PK uuid → `entitasId` diisi uuid baris.
- CHARGE_CODE → `entitasId: null`; kodenya tetap terekam di JSON
  `sebelum`/`sesudah` dan field `alasan`.
Jadi `entitas_id` boleh null hanya untuk entitas CHARGE_CODE; selain itu wajib
terisi. Jangan tambah migrasi NOT NULL — akan merusak charge_codes.
