# HANDOFF IRISAN 3 CRUD — SESI D3 (STATUS AKURAT, DITIMPA)

> File ini DITIMPA setelah sesi D3. Strategi dari user: SATU sesi =
> SATU halaman, paling sederhana dulu. Setelah hijau + commit, BERHENTI.

## Status terkini (jujur)

**Halaman `/master/ship-lines` SELESAI, hijau, ter-commit: `325a7bf`
`feat(master-ship-lines): halaman CRUD /master/ship-lines - Irisan 3 sesi D3`.**

Hasil gate LITERAL untuk ship-lines (semua hijau):
- `pnpm tsc --noEmit` → exit 0, tanpa output error.
- `pnpm vitest run` → `Test Files  15 passed (15)`,
  `Tests  163 passed (163)` (termasuk integrasi DB: "port & ship line:
  buat + edit + audit").
- `pnpm biome check` → `Checked 59 files in 25ms. No fixes applied.`
  `Found 8 warnings.` exit 0 — 8 warnings itu PRE-EXISTING di luar
  ship-lines; kedua file ship-lines sudah diformat `--write` dan bersih
  dari error.

Status halaman sebelumnya: `/master/ports` selesai di commit `5191997`
(sesi D2).

## Yang dibangun untuk ship-lines

- `src/app/master/ship-lines/page.tsx` (server component): `requireUser()`
  + `daftarShipLine(db)`; tabel 3 kolom (Kode, Nama, Aksi); pill
  "Tambah Ship Line" membuka dialog; pill "Ubah" di tiap baris berupa
  link `?edit=<id>`; BarisKosong bila daftar kosong. Kode boleh kosong
  (nullable di DB) → dirender "—" bila null.
- `src/app/master/ship-lines/form.tsx` (`"use client"`): `useActionState`
  membungkus `actionBuatShipLine` / `actionUbahShipLine`; field kode
  (opsional), nama* (required); PesanHasil sukses/error; PeringatanMirip
  bila `miripDengan` dikembalikan; dialog edit dipicu `searchParams.edit`.
- TANPA tombol/form nonaktifkan — sesuai RENCANA §6: ship-lines (sama
  seperti ports) tidak punya konsep aktif/nonaktif di UI (kolom `aktif`
  ada di DB tapi tidak ditampilkan/dikelola).

## Urutan pengerjaan sisa (sesi berikutnya)

vendors → customers → charge-codes → hub `/master/page.tsx` (paling
akhir). Satu sesi SATU halaman; tiap halaman wajib gate `tsc --noEmit` +
`vitest run` + `biome check` hijau, lalu commit, lalu timpa file ini
dengan status akurat, lalu BERHENTI.

## Fakta yang TERVERIFIKASI (dipakai ulang tiap sesi — tidak perlu dicek lagi)

1. **Server actions PERSIS** (`src/lib/actions/master.ts`, semua menerima
   `FormData`, mengembalikan `Promise<HasilAction>`):
   - `actionBuatCustomer`, `actionUbahCustomer` (field FormData: id*,
     nama, legalName, npwp, alamat, topHari, pph23Default[checkbox]);
     `actionStatusCustomer`
   - `actionBuatVendor`, `actionUbahVendor` (+ vendorType, paymentTerm,
     paymentTermDays); `actionStatusVendor`
   - `actionBuatPort`, `actionUbahPort` (kode, nama, negara) — SUDAH DIPAKAI
   - `actionBuatShipLine`, `actionUbahShipLine` (kode, nama) — SUDAH DIPAKAI
   - `actionUbahChargeCode` (kode sbg id; keterangan, nameId, category,
     defaultLeg, kategoriFixed[checkbox → FIXED/OPSIONAL], segmentScope
     [DOM|EXIM|BOTH], defaultReimburse, isAtCostDefault, isTaxable,
     pph23Applicable, butuhVendor); `actionStatusChargeCode`
   - Status action membaca `id`, `aktifBaru` ("true"/"false"), `alasan`.
   - `HasilAction = { ok:true; miripDengan?: {id,nama,skor}[] } |
     { ok:false; error:string }`.
2. **daftar\*** di `src/lib/master-data/index.ts` (semua hanya perlu
   `dbOrTx`, urut abadi): `daftarCustomer` (by nama), `daftarVendor`
   (by nama), `daftarPort` (by nama) — SUDAH DIPAKAI, `daftarShipLine`
   (by nama) — SUDAH DIPAKAI, `daftarChargeCode` (by kode).
3. **Kolom DB** (dari 0000 + 0002):
   - customers: id, nama, legal_name, npwp, alamat, top_hari,
     pph23_default, aktif
   - vendors: id, nama, legal_name, npwp, vendor_type, payment_term,
     payment_term_days, pph23_default, aktif
   - charge_codes: kode (immutable), keterangan, name_id, category
     (nullable), default_leg, kategori (FIXED|OPSIONAL), segment_scope
     (DOM|EXIM|BOTH), default_reimburse, is_at_cost_default, is_taxable,
     pph23_applicable, butuh_vendor, aktif
4. **Komponen siap pakai** `src/components/master/primitives.tsx`:
   PageHeader, DataTable/Kolom, BarisKosong, FormDialog (+Field, Input,
   Checkbox, Select, TextArea), PillButton, PesanHasil, PeringatanMirip,
   BadgeStatus, requiredMark, kls. Token desain: canvas, ink/ink-80/ink-48,
   hairline, divider, accent/accent-focus/accent-dark; tanpa shadow.

## Pola halaman untuk sesi berikutnya (contoh konkret: tiru ports / ship-lines)

1. Server component `page.tsx`: `requireUser()` dari
   `@/lib/session/index`, `daftarX(db)` dari `@/lib/master-data/index`,
   render DataTable; dialog tambah + `searchParams.edit` → dialog edit
   dengan `form.tsx`.
2. Client component `form.tsx`: `"use client"`; props `mode:
   "buat" | "ubah"` + `awal?` + `onTutup`; `useActionState(action,
   stateAwal)`; submit → bila `res.ok`, `router.refresh()`; tombol batal
   menutup dialog (`router.push("/master/<halaman>")` saat mode edit).
3. Halaman dengan kolom `aktif` (vendors, customers, charge-codes)
   MENAMBAHKAN: BadgeStatus di kolom status + tombol/form nonaktifkan
   (`actionStatusX` dengan `id`, `aktifBaru`, `alasan` wajib saat
   menonaktifkan) — berbeda dari ports & ship-lines yang tanpa nonaktif.
4. Gate: `pnpm tsc --noEmit`; `pnpm vitest run`;
   `pnpm biome check` (atau `npx @biomejs/biome check <file-baru> --write`
   lalu cek ulang).
5. `git add <file-baru>` → commit dengan pesan
   `feat(master-<halaman>): halaman CRUD /master/<halaman> - Irisan 3`.
6. Timpa file ini dengan status akurat, commit docs terpisah, BERHENTI.

## Catatan teknis

- PowerShell: jangan pakai `&&`; pakai `;` antar perintah.
- Output `npx vitest run` kadang terpotong di terminal; pastikan baris
  `Test Files ... passed` dan `Tests ... passed` serta `EXIT:0`.
- Vitest penuh (`pnpm vitest run`) butuh DB lokal (integration test
  master-data); bila gagal koneksi, pastikan Postgres lokal jalan.
