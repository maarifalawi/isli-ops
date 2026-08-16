# Rencana Irisan 3 — CRUD Master Data

Ditulis oleh sesi lanjutan setelah `docs/HANDOFF-IRISAN-3-CRUD-PLAN-SESSION.md`.
Semua 7 bahan wajib sudah dibaca (RBAC, DESIGN-SYSTEM, fixtures, authz,
.clinerules, survei `src/app`, grep `audit_log`). Bila berkas ini bertentangan
dengan `docs/HANDOFF-IRISAN-3-CRUD.md`, MENANGKAN berkas ini — berkas lama itu
belum diverifikasi (mis. ia menyebut aksi `masterdata.edit`; kode aktual memakai
`master:manage`).

---

## 1. Fakta final yang diverifikasi sesi ini

1. **Authz** (`src/lib/authz/index.ts`): aksi master data adalah
   `"master:manage"`. OWNER ✓, MANAGER ✓, STAFF ✗. Semua cek lewat
   `assertCan(role, action)`; `AuthorizationError` berpesan
   `Peran ${role} tidak berwenang melakukan "${action}".`
   DILARANG menulis `role === "OWNER"` di fitur (ditegakkan dependency-cruiser).
2. **R-A6 sudah DICABUT** 13 Agu 2026 (staf boleh lihat margin) — tidak relevan
   untuk irisan ini, jangan hidupkan lagi.
3. **Skema `audit_log` AKTUAL** (drizzle, `src/db/schema/index.ts`) berbeda dari
   ERD.md: `id uuid PK, user_id uuid FK users, aksi text, entitas text,
   entitas_id uuid, sebelum text (JSON), sesudah text (JSON), alasan text,
   created_at timestamptz`. Kolom bahasa Indonesia, bukan `entity_type/old_value`.
   **Belum ada helper penulisan audit di seluruh repo** — harus dibuat baru.
   Pola yang dipakai: ikuti skema aktual codebase (bukan kolom ERD), karena
   skema aktual yang hidup di DB.
4. **`entitas_id` bertipe uuid**, padahal PK `charge_codes` adalah `kode` TEXT.
   Keputusan: untuk entitas CHARGE_CODE, `entitas_id` = NULL; kode direkam di
   JSON `sebelum`/`sesudah` dan di `alasan` bila perlu.
5. **Master data di DB sudah lengkap** (migrasi `0002_iris3_master_data.sql`
   sudah jalan): `customers`, `vendors`, `ports`, `ship_lines`, `charge_codes`
   — semua punya `aktif` boolean (kecuali ports/ship_lines yang tidak punya
   `aktif` → keputusan §6). `charge_codes` punya CHECK
   `segment_scope IN ('DOM','EXIM','BOTH')`.
6. **`src/app` masih kosong fitur**: hanya `page.tsx`, `login/`, `logout/`.
   Belum ada pola server action/form/tabel — irisan ini YANG MENETAPKAN polanya.
7. **Fixtures** `customers-raw.csv` / `vendors-raw.csv`: semua kolom `*_TODO`
   kosong (jangan ditebak — hanya bahan uji kemiripan nama). Kasus uji nyata:
   `MATEREE` vs `MATEREE NUSANTARA` (customer), vendor mirip: `MERATUS`,
   `SCANSHIPPPING`, `SPIL`.
8. **RBAC.md** (docs): `masterdata.edit` OWNER+MANAGER; "Setiap ✗ wajib punya
   test" → STAFF-ditolak harus diuji per operasi.
9. **.clinerules**: soft delete saja (tanpa DELETE keras); `audit_log`
   append-only (REVOKE UPDATE/DELETE dari `app_role`); migrasi lewat
   generate→baca→migrate; uang BIGINT; tidak ada dependency baru tanpa ADR.
10. **DESIGN-SYSTEM**: hanya token yang boleh dipakai; tabel kepala
    `--parchment` 12px kapital; baris 36px; tanpa garis vertikal/zebra;
    badge = titik 6px + teks; warna semantik hanya pada teks/garis/titik;
    form 36px radius 8px; tombol utama pill `--accent`; sentuh ≥44px;
    `<640px` tabel jadi kartu bertumpuk.

---

## 2. Lingkup

CRUD lima entitas master: **Customer, Vendor, Port, Ship Line, Charge Code**.
Termasuk: deteksi kemiripan nama (warning, tidak memblokir), audit log semua
mutasi, soft delete, pagar RBAC `master:manage`.

Di luar lingkup: user management, import massal, laporan.

---

## 3. Struktur route & folder (keputusan + alasan)

```
src/app/master/
  page.tsx                    # hub: 5 kartu tautan (kamus data)
  customers/page.tsx  actions.ts
  vendors/page.tsx    actions.ts
  ports/page.tsx      actions.ts
  ship-lines/page.tsx actions.ts
  charge-codes/page.tsx actions.ts
src/components/master/
  data-table.tsx   master-form.tsx  status-badge.tsx  money-input.tsx (bila perlu)
src/lib/audit/index.ts               # helper writeAudit
src/lib/master-data/similarity.ts    # deteksi nama mirip
```

**Inline, bukan modal, bukan halaman terpisah.** Alasan:
- Belum ada komponen modal di DESIGN-SYSTEM (spec Apple: "modal 0 kali");
  membangun modal berarti menambah permukaan uji tanpa kebutuhan.
- Server action + progresif enhancement paling sederhana dengan form inline:
  baris Edit menggantikan baris tabel dengan form; form Tambah muncul di atas
  tabel. Nonaktifkan = baris melebar menampilkan field `alasan`.
- Mobile `<640px` tabel sudah berubah kartu — form inline tetap bekerja,
  modal tidak.

Navigasi: tambah tautan "Master Data" di header `layout.tsx` (token `--black`
navbar sudah ada di DESIGN-SYSTEM; ikut pola yang ada, jangan mengarang).

---

## 4. Pola server action (ditetapkan irisan ini)

Satu berkas `actions.ts` per route, `"use server"`, urutan WAJIB:

```ts
"use server";
1. const session = await requireSession();          // src/lib/session
2. assertCan(session.role, "master:manage");        // SATU pintu (ADR-0004)
3. validasi input (zod JIKA sudah ada di package.json — cek dulu;
   kalau tidak ada, validasi manual; JANGAN tambah dependency tanpa ADR)
4. await db.transaction(async (tx) => {
     const sebelum = await tx.select(...).where(id);   // snapshot
     const sesudah = await tx.update(...).returning(); // mutasi
     await writeAudit(tx, { userId, aksi, entitas, entitasId, sebelum, sesudah, alasan });
   });
5. revalidatePath("/master/..."); return { ok: true } | { ok:false, error }
```

- Tangkap `AuthorizationError` → kembalikan `{ ok:false, error: e.message }`;
  UI menampilkan pesan persis dari authz (jangan mengarang teks baru).
- **1 aksi mutasi = tepat 1 baris `audit_log`** di transaksi yang sama.
  Mutasi tanpa baris audit = bug.
- Nilai `aksi`: `CREATE | EDIT | NONAKTIFKAN | AKTIFKAN`.
  Nilai `entitas`: `CUSTOMER | VENDOR | PORT | SHIP_LINE | CHARGE_CODE`.
- `sebelum`/`sesudah` = `JSON.stringify` baris lengkap (tanpa filter).

## 5. Helper audit (`src/lib/audit/index.ts`)

```ts
export function writeAudit(tx, {
  userId, aksi, entitas, entitasId,   // entitasId: string | null (null utk CHARGE_CODE)
  sebelum?, sesudah?, alasan?,
}) → tx.insert(auditLog).values({ ... })
```

Append-only: tidak boleh ada satu pun kode memanggil `update`/`delete` pada
`auditLog` (checklist PR PROMPT-CURSOR butir 11).

**Langkah verifikasi REVOKE** (sebelum implementasi):
`grep -i "REVOKE" drizzle/*.sql` dan `grep -i "app_role" drizzle/*.sql`.
- Kalau `app_role` sudah ada di migrasi → buat migrasi kecil berisi
  `REVOKE UPDATE, DELETE ON audit_log FROM app_role;` (lewati generate; SQL
  mentah dibaca manusia lalu `db:migrate`; catat di ERD.md).
- Kalau `app_role` TIDAK ada → JANGAN mengarang role baru. Catat sebagai
  OPEN-QUESTION dan andalkan disiplin kode + test; REVOKE menyusul bersama
  setup role DB.

---

## 6. Aturan per entitas

| Entitas | Field form | Catatan khusus |
|---|---|---|
| Customer | nama*, legalName, npwp, alamat, topHari (int ≥0, default 30), pph23Default | deteksi mirip nama saat CREATE & EDIT-nama |
| Vendor | nama*, legalName, npwp, vendorType (select: PELAYARAN/TRUCKING/DOORING/EMKL/LAINNYA), paymentTerm (CASH/TEMPO), paymentTermDays, pph23Default | deteksi mirip nama |
| Port | kode (unik), nama*, negara (default "ID") | tanpa kolom `aktif` → edit saja; jangan tambah kolom tanpa migrasi disetujui |
| Ship Line | kode (unik), nama* | sama seperti port |
| Charge Code | kode* **immutable** (disabled saat edit), nameId*, category (FREIGHT/TERMINAL/DARAT/DOKUMEN/INTERNAL), defaultLeg (1/2/3/kosong), kategori (FIXED/OPSIONAL), segmentScope (DOM/EXIM/BOTH), defaultReimburse, isAtCostDefault, isTaxable, pph23Applicable, butuhVendor | CHECK DB menolak segment_scope di luar 3 nilai — biarkan error DB muncul sebagai pesan |

- **Soft delete** = `UPDATE aktif=false` + baris audit `NONAKTIFKAN` dengan
  `alasan` WAJIB. Reaktivasi = `AKTIFKAN` (alasan opsional). Tidak ada DELETE.
- Port/ship_line tak punya `aktif`: tanpa tombol nonaktifkan (catat keputusan
  ini di handoff; menambah kolom = migrasi baru = approval dulu).
- `charge_codes.kode` immutable: field disabled + server action menolak
  perubahan kode (jangan percaya UI saja).
- Nonaktifkan charge code aman dari FK karena baris tetap ada
  (`charge_lines.charge_code` tetap menunjuk baris `aktif=false`).
- Dropdown pemilih (mis. customer di form job nanti) hanya menampilkan
  `aktif=true`.

## 7. Deteksi kemiripan nama (`src/lib/master-data/similarity.ts`)

- Normalisasi: uppercase, trim, kolaps spasi.
- Mirip bila: (a) salah satu nama mengandung nama lain (min 4 char), ATAU
  (b) jarak Levenshtein ≤ 2 untuk nama ≥ 5 char. Implementasi Levenshtein
  sendiri (~15 baris, tanpa dependency).
- **Warning, bukan blokir**: CREATE tetap berhasil; UI menampilkan kartu
  peringatan bergaris `--hairline` dengan teks `#c93400` (per DESIGN-SYSTEM:
  warna semantik hanya pada teks, bukan latar blok).
- Dicek terhadap entitas AKTIF saja, saat CREATE dan saat mengubah nama.
- Kasus uji wajib: `MATEREE` ↔ `MATEREE NUSANTARA` (mengandung) → mirip;
  `MERATUS` ↔ `MERATAS` (jarak 1) → mirip; `SPIL` ↔ `TEMAS` → tidak mirip.

---

## 8. UI — kepatuhan DESIGN-SYSTEM

Tabel: kepala `--parchment`/`--ink-48`/12px kapital tracking 0.04em; baris
36px garis bawah 1px `--divider`; hover `--parchment`; tanpa garis vertikal.
Angka (topHari, paymentTermDays) rata kanan `tabular-nums`.
Badge status: titik 6px (`#248a3d` aktif / `#6c6c70` nonaktif) + teks.
Form: 1px `--hairline`, radius 8px, tinggi 36px, fokus cincin `--accent-focus`.
Tombol utama pill `--accent`; tombol "Nonaktifkan" = varian Merusak
(transparan, teks/garis `#d70015`); tekan = `scale(0.96)`. Sasaran sentuh
≥44px; `<640px` tabel → kartu bertumpuk. DILARANG: warna Tailwind bawaan,
gradien, box-shadow, emoji sebagai ikon.

## 9. Pengujian (wajib; .clinerules/04 — setiap ✗ RBAC diuji)

1. **Unit** `similarity.test.ts`: kasus §7 + normalisasi.
2. **Integrasi** (ikut pola `tests/integration/job-sequence.integration.test.ts`,
   DB nyata): per entitas —
   - STAFF create/edit/nonaktifkan → melempar `AuthorizationError`
     (5 entitas × 3 operasi = 15 kasus tolak; boleh diparameterisasi);
   - MANAGER & OWNER edit berhasil;
   - setiap mutasi menulis tepat 1 baris `audit_log` dengan `sebelum`/`sesudah`
     benar; NONAKTIFKAN tanpa `alasan` → ditolak;
   - edit charge code dengan `kode` berubah → ditolak;
   - `segment_scope` invalid → ditolak (CHECK DB).
3. **E2E** `tests/e2e/master-data.spec.ts` (Playwright, pola `auth.spec.ts`):
   alur demo wajib: login STAFF → coba tambah customer → pesan
   `Peran STAFF tidak berwenang melakukan "master:manage".` → logout → login
   MANAGER → edit vendor berhasil → baris `audit_log` terlihat (halaman audit
   tidak dibangun irisan ini; verifikasi lewat query di test) → buat customer
   "MATEREE" kedua-dua-nya → warning kemiripan tampil.
4. `pnpm verify` (lint+typecheck+test) hijau sebelum commit terakhir.

## 10. Urutan pengerjaan & commit (hijau per bagian)

1. `src/lib/audit` + verifikasi REVOKE (§5) + unit/integrasi dasar → commit.
2. `src/lib/master-data/similarity.ts` + unit test → commit.
3. Server actions kelima entitas + test integrasi §9.2 → commit (boleh
   dipisah per entitas bila besar).
4. Komponen `src/components/master` + halaman `/master/**` → commit.
5. E2E + `pnpm verify` + mutakhirkan `docs/ERD.md` hanya bila ada migrasi baru,
   lalu tulis handoff akhir → commit.

## 11. Definition of done

- Semua test §9 hijau; `pnpm verify` hijau.
- Alur nyata bisa didemokan: STAFF ditolak → MANAGER edit berhasil → baris
  `audit_log` (old/new JSON) ada → warning mirip "MATEREE" muncul.
- Tidak ada `DELETE` keras, tidak ada `UPDATE/DELETE` ke `audit_log`, tidak
  ada `role ===` di kode fitur, tidak ada dependency baru tanpa ADR, UI hanya
  memakai token DESIGN-SYSTEM.
- `docs/HANDOFF-IRISAN-3-CRUD.md` ditimpa handoff akhir yang akurat
  (berkas lama diketahui mengandung ketidaktepatan, mis. `masterdata.edit`).
