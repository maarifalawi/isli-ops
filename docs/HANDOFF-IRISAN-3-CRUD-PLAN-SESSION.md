# Handoff rencana CRUD Irisan 3 — sesi Plan-mode 15 Agu 2026

> Sesi sebelumnya **berhenti karena context window penuh (106%)** sebelum selesai
> membaca semua bahan wajib. Rencana BELUM ditulis. Berkas ini adalah titik lanjut
> untuk sesi baru. `docs/HANDOFF-IRISAN-3-CRUD.md` ada tapi **belum tentu akurat** —
> kalau bertentangan dengan fakta di bawah, fakta di bawah yang benar.

## Fakta yang SUDAH diverifikasi & final (JANGAN diulang/disentuh)

- Migrasi `drizzle/0002_iris3_master_data.sql` APPLIED, hash cocok.
- `charge_codes` = 43 baris, **semua OPSIONAL**, tidak ada FIXED (Q76 belum dijawab —
  DILARANG menandai FIXED; kode baru lewat form default OPSIONAL, tanpa opsi FIXED di UI).
- `customers` = 5, `vendors` = 8, `ports` = 21, `ship_lines` = 11.
- `scripts/seed.ts` idempoten (commit 5b0026b, c491c02, sudah push origin/main).
- `docs/HANDOFF-IRISAN-3.md` final.
- Skrip tmp verifikasi (`tmp-verify-iris3.ts`, `tmp-run-verify.ps1`) sudah dihapus;
  `git status` bersih kecuali `?? docs/HANDOFF-IRISAN-3-CRUD.md`.

## Yang SUDAH dibaca sesi lalu

### docs/ERD.md (master data + charge_code + audit_log) — ringkasan kolom

- `customer`: id, name, legal_name, npwp, address, default_top_days,
  is_pph23_withholder (🔴 Q04), active.
- `vendor`: id, name, legal_name, npwp, vendor_type
  (PELAYARAN|TRUCKING|DOORING|EMKL|LAINNYA), payment_term (CASH|TEMPO),
  payment_term_days, active.
- `port`: id, code UNIQUE, name, country (default 'ID').
- `ship_line`: id, code UNIQUE, name.
- `charge_code`: id, code UNIQUE, name_id, category
  (FREIGHT|TERMINAL|DARAT|DOKUMEN|INTERNAL), default_leg, is_taxable,
  is_at_cost_default, pph23_applicable, segment_scope (DOM|EXIM|BOTH),
  wajib_mujur/wajib_muncul, active; tambahan 13 Agu: `needs_vendor` BOOLEAN
  DEFAULT true. Catatan: ERD pakai nama singular (charge_code dll), tapi skema
  DB aktual drizzle pakai plural — cek `src/db/schema/index.ts` di sesi baru.
- `audit_log`: id BIGSERIAL, entity_type TEXT, entity_id UUID, action TEXT,
  actor_id UUID (FK app_user), old_value JSONB, new_value JSONB, reason TEXT,
  created_at; **append-only** (REVOKE UPDATE, DELETE). Index ix_audit_entity.

### docs/DOMAIN-RULES.md R15.1–R15.5

- R15.3: kewajiban vendor per kode biaya via `charge_codes.needs_vendor`
  (default true); daftar kode tanpa vendor belum dikonfirmasi Bu Niken (🔴).
- R15.4: validasi di lapis aplikasi, BUKAN CHECK/NOT NULL di DB.
- R15.5: kategori FIXED vs OPSIONAL; default kode baru = OPSIONAL; klien belum
  menandai FIXED (Q72).

## Yang BELUM dibaca (WAJIB di sesi baru sebelum menulis rencana)

1. `docs/RBAC.md` — seluruh matriks (bukan cuma masterdata.edit).
2. `docs/DESIGN-SYSTEM.md` — seluruhnya (token warna, tabular-nums, tanpa
   shadow/gradien/emoji).
3. `fixtures/customers-raw.csv` & `fixtures/vendors-raw.csv`.
4. `src/lib/authz/index.ts` — pola `assertCan()` & format penolakan.
5. `.clinerules/04-testing.md` & `.clinerules/06-db-migrations.md`.
6. Survei `src/app/**` — pola routing/form/tabel/server action Irisan 0–2.
7. Grep `audit_log` di seluruh repo — ada/tidaknya pola penulisan yang sudah ada.

## Aturan keras yang berlaku (dari prompt klien)

- Importer CLI `scripts/import-customers-vendors.ts` (bukan UI upload); hanya
  baris dengan `canonical_name_TODO` terisi; idempoten via onConflictDoNothing.
- CRUD 5 tabel master data via Server Actions (kecuali ada pola API route yang
  sudah ada di Irisan 0–2 — ikut pola yang ada).
- Guard `masterdata.edit` HANYA via `assertCan()`; OWNER & MANAGER saja; STAFF
  ditolak dengan format error yang sudah ada di authz.
- Soft delete = UPDATE `aktif`/`active` = false. DILARANG DELETE SQL keras.
- 1 aksi mutasi = 1 baris audit_log (aktor, entitas, aksi, old/new, timestamp).
- `charge_codes.kode` immutable setelah dibuat.
- Deteksi nama mirip: Levenshtein buatan sendiri di src/lib (tanpa dependency
  baru), threshold konstanta 0.75, non-blocking warning di CREATE & EDIT,
  normalisasi PT/CV/UD + trim/collapse + lowercase. Test wajib kasus MATEREE.
- Form field = PERSIS kolom ERD kecuali id/created_at/updated_at/aktif.
- DILARANG: mengisi `_TODO` di fixtures asli, menebak NPWP, normalisasi otomatis
  ke DB, migrasi baru tanpa approve, dependency baru tanpa ADR, UPDATE/DELETE
  ke audit_log, menggambar ulang UI di luar token DESIGN-SYSTEM.
- Commit per bagian yang hijau (jangan tumpuk di akhir).
- Selesai bila: semua test wajib hijau, `pnpm verify` hijau, dan alur nyata
  STAFF-ditolak → MANAGER-edit-berhasil → audit_log → warning mirip-MATEREE
  bisa ditunjukkan.

## Keputusan yang masih harus ada di rencana sesi baru

- Daftar kolom final per 5 entitas untuk form (dari ERD, minus id/created_at/
  updated_at/aktif).
- Struktur route/folder halaman CRUD + alasan (inline vs modal).
- Pola audit_log final: ikuti pola codebase kalau ada; kalau tidak, kolom persis
  ERD di atas.
- Daftar berkas yang dibuat/diubah.
