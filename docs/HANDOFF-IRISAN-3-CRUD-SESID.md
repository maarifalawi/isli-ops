# HANDOFF IRISAN 3 CRUD — SESI E (STATUS AKURAT, DITIMPA)

> File ini DITIMPA setelah sesi D2. Strategi baru dari user: SATU sesi =
> SATU halaman, paling sederhana dulu. Setelah hijau + commit, BERHENTI.

## Status terkini (jujur)

**Halaman `/master/ports` SELESAI, hijau, ter-commit: `5191997`
`feat(master-ports): halaman CRUD /master/ports - Irisan 3 sesi D2`.**

Hasil gate LITERAL untuk ports (semua hijau):
- `npx tsc --noEmit` → exit 0, tanpa output error.
- `npx vitest run` → `Test Files 40 passed (40)`, `Tests 135 passed (135)`.
- `npx @biomejs/biome check src/app/master/ports src/components/master`
  → 0 errors, 0 warnings (format via `biome check --write`).

Ikut ter-commit di `5191997` (sudah terverifikasi hijau bersama ports):
- `src/app/layout.tsx`: nav link "Master Data" → `/master` + label header
  "Irisan 3 · CRUD master" (sisa kerja sesi sebelumnya yang belum commit).
- `src/lib/actions/master.ts`: hanya urut ulang impor (biome organize),
  tanpa perubahan logika.
- `src/components/master/primitives.tsx`: fix format biome.

## Yang dibangun untuk ports

- `src/app/master/ports/page.tsx` (server component): `requireUser()` +
  `daftarPort(db)`; tabel 4 kolom (Kode, Nama, Negara, Aksi); pill
  "Tambah Port" membuka dialog; pill "Ubah" di tiap baris berupa link
  `?edit=<id>`; BarisKosong bila daftar kosong.
- `src/app/master/ports/form.tsx` (`"use client"`): `useActionState`
  membungkus `actionBuatPort` / `actionUbahPort`; field kode, nama*,
  negara (default "ID"); kode & nama `required`; PesanHasil sukses/error;
  PeringatanMirip bila `miripDengan` dikembalikan; dialog edit dipicu
  `searchParams.edit`.
- TANPA tombol/form nonaktifkan — sesuai RENCANA §6: ports & ship-lines
  tidak punya konsep aktif/nonaktif di UI (kolom `aktif` ada di DB tapi
  tidak ditampilkan/dikelola).

## Urutan pengerjaan sisa (dari user, sesi E dst)

ship-lines → vendors → customers → charge-codes → hub `/master/page.tsx`
(paling akhir). Satu sesi SATU halaman; tiap halaman wajib gate
`tsc --noEmit` + `vitest run` + `biome check <file>` hijau, lalu commit,
lalu timpa file ini dengan status akurat, lalu BERHENTI.

## Fakta yang TERVERIFIKASI (dipakai ulang tiap sesi — tidak perlu dicek lagi)

1. **Server actions PERSIS** (`src/lib/actions/master.ts`, semua menerima
   `FormData`, mengembalikan `Promise<HasilAction>`):
   - `actionBuatCustomer`, `actionUbahCustomer` (field FormData: id*,
     nama, legalName, npwp, alamat, topHari, pph23Default[checkbox]);
     `actionStatusCustomer`
   - `actionBuatVendor`, `actionUbahVendor` (+ vendorType, paymentTerm,
     paymentTermDays); `actionStatusVendor`
   - `actionBuatPort`, `actionUbahPort` (kode, nama, negara) — SUDAH DIPAKAI
   - `actionBuatShipLine`, `actionUbahShipLine` (kode, nama)
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
   (by nama), `daftarChargeCode` (by kode).
3. **Kolom DB** (dari 0000 + 0002):
   - customers: id, nama, legal_name, npwp, alamat, top_hari,
     pph23_default, aktif
   - vendors: id, nama, legal_name, npwp, vendor_type, payment_term,
     payment_term_days, pph23_default, aktif
   - ship_lines: id, kode (nullable, unique), nama, aktif (tidak
     ditampilkan/dikelola — pola sama dengan ports)
   - charge_codes: kode (immutable), keterangan, name_id, category
     (nullable), default_leg, kategori (FIXED|OPSIONAL), segment_scope
     (DOM|EXIM|BOTH), default_reimburse, is_at_cost_default, is_taxable,
     pph23_applicable, butuh_vendor, aktif
4. **Komponen siap pakai** `src/components/master/primitives.tsx`:
   PageHeader, DataTable/Kolom, BarisKosong, FormDialog (+Field, Input,
   Checkbox, Select, TextArea), PillButton, PesanHasil, PeringatanMirip,
   BadgeStatus, requiredMark, kls. Token desain: canvas, ink/ink-80/ink-48,
   hairline, divider, accent/accent-focus/accent-dark; tanpa shadow.

## Pola halaman untuk sesi berikutnya (contoh konkret: tiru ports)

1. Server component `page.tsx`: `requireUser()` dari
   `@/lib/session/index`, `daftarX(db)` dari `@/lib/master-data/index`,
   render DataTable; dialog tambah + `searchParams.edit` → dialog edit
   dengan `form.tsx`.
2. Client component `form.tsx`: `"use client"`; props `mode:
   "buat" | "ubah"` + `awal?` + `onTutup`; `useActionState(action,
   stateAwal)`; submit → bila `res.ok`, `router.refresh()`; tombol batal
   menutup dialog (`router.push("/master/<halaman>")` saat mode edit).
3. Gate: `npx tsc --noEmit`; `npx vitest run`;
   `npx @biomejs/biome check <file-baru> --write` lalu cek ulang.
4. `git add <file-baru>` → commit dengan pesan
   `feat(master-<halaman>): halaman CRUD /master/<halaman> - Irisan 3`.
5. Timpa file ini dengan status akurat, commit docs terpisah, BERHENTI.

## Catatan teknis

- PowerShell: jangan pakai `&&`; pakai `;` antar perintah.
- Output `npx vitest run` kadang terpotong di terminal; pastikan baris
  `Test Files ... passed` dan `Tests ... passed` serta `EXIT:0`.
