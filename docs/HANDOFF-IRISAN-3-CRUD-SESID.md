# HANDOFF IRISAN 3 CRUD — SESI D4 (diperbarui Sesi D4b: vendors SELESAI & ter-commit)

> Status: **vendors CRUD selesai & ter-commit (commit 110df3e), semua gate hijau**.
> Customers BELUM dimulai (context sesi D4b habis setelah vendors).
> Lanjut sesi berikutnya: kerjakan customers persis mengikuti pola vendors.

## HASIL SESI D4b (commit 110df3e)

### Yang dibuat
- `src/app/master/vendors/page.tsx` — server component, pola persis ports/ship-lines:
  `requireRole(["ADMIN","OPERATOR"])` + `catatAudit` per render; cari `?q`
  (lower(nama) LIKE), urut nama asc; tabel kolom Nama, Tipe, Term (+hari),
  PPh23, **Status (BadgeStatus)**, Aksi; tombol "Tambah Vendor".
- `src/app/master/vendors/form.tsx` — client component:
  - `FormBuatVendor` / `FormUbahVendor`: useActionState + actionBuatVendor/
    actionUbahVendor; field nama (minLength 2), legalName, npwp, vendorType
    (SHIPPING/CONT/TRUCKING/OTHERS), paymentTerm (default TOP),
    paymentTermDays (default 30), checkbox pph23Default; PeringatanMirip
    tampil bila action kembalikan miripDengan; sukses tanpa mirip →
    router.push("/master/vendors") + refresh.
  - `FormNonaktifVendor`: form terpisah (bukan inline) dengan field alasan
    WAJIB (minLength 3) + hidden aktifBaru=false → actionStatusVendor;
    dipicu `?nonaktif=<id>`.
  - `FormAktifkanVendor`: tombol inline di baris tabel, hidden aktifBaru=true
    (alasan opsional/skip) → actionStatusVendor.

### Gate (semua hijau, hasil literal)
```
$ pnpm tsc --noEmit
TSC-EXIT:0

$ pnpm biome check src/app/master/vendors
Checked 2 files in 5ms. No fixes applied.
BIOME-EXIT:0

$ pnpm vitest run
 Test Files  15 passed (15)
      Tests  163 passed (163)
VITEST-EXIT:0
```
Catatan biome: `autoFocus` dihapus (lint a11y noAutofocus) — konsisten
dengan ports/ship-lines yang juga tidak memakai autoFocus.

### Commit
```
110df3e feat(master): CRUD vendors - halaman daftar, form buat/ubah, nonaktif (alasan wajib)/aktifkan
 2 files changed, 444 insertions(+)
```

## INSTRUKSI SESI BERIKUTNYA — customers

1. Kerjakan customers dengan pola PERSIS sama seperti vendors (jangan bikin
   pola baru). Sumber fakta: bagian "Fakta TERVERIFIKASI sesi D4" di bawah
   (masih valid) + baca `src/app/master/vendors/` sebagai template terdekat.
2. Entitas customers: skema sudah ada (SESIB/SESID facts di bawah); actions
   `actionBuatCustomer` / `actionUbahCustomer` / `actionStatusCustomer`
   sudah ada di `src/lib/actions/master.ts` — tinggal dipakai dari form.
3. Tambahkan kolom Status (BadgeStatus) + aksi Nonaktifkan (alasan WAJIB) /
   Aktifkan (opsional) — tiru vendors persis.
4. Gate wajib: `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm biome check`
   (semua hijau, tempel hasil literal), lalu commit.
5. Setelah customers: audit-coverage di page.tsx (catatAudit per render)
   sudah menjadi pola — pertahankan.
6. Jangan lupa `pnpm biome check --write` setelah menulis file baru, lalu
   hapus `autoFocus` bila dipakai (rule a11y aktif di repo ini).

---

## Fakta TERVERIFIKASI sesi D4 (commit e2fbffe) — tetap jadi acuan

### 1. Actions master data yang SUDAH ADA di src/lib/actions/master.ts
- Ports: `actionBuatPort`, `actionUbahPort`, `actionHapusPort` (soft delete `isDeleted`)
- Ship lines: `actionBuatShipLine`, `actionUbahShipLine`, `actionStatusShipLine` (toggle isActive; alasan opsional)
- Vendors: `actionBuatVendor`, `actionUbahVendor`, `actionStatusVendor` (toggle isActive; alasan WAJIB saat nonaktif, opsional saat aktif — divalidasi `ubahStatusAktif`)
- Customers: `actionBuatCustomer`, `actionUbahCustomer`, `actionStatusCustomer` (toggle isActive)
- Charge codes: `actionBuatChargeCode`, `actionUbahChargeCode`, `actionStatusChargeCode`
- Rate cards: `actionBuatRateCard`, `actionUbahRateCard`, `actionStatusRateCard`

Semua pakai pola sama: `"use server"` → `requireRole([...])` → `parseFormData`
(zod) → `db.transaction` → `catatAudit(...)`. Return type `HasilAction`:
`{ ok: true; message: string; miripDengan?: Array<{ id; nama; skor }> }` |
`{ ok: false; error: string }`.

### 2. Validasi di src/lib/master-data/index.ts
- `buatPort`, `ubahPort`, `hapusPort`, `buatShipLine`, `ubahShipLine`,
  `ubahStatusAktif` (shared: vendors/ship-lines/customers/charge-codes/rate-cards),
  `buatVendor`, `ubahVendor`, `buatCustomer`, `ubahCustomer`,
  `buatChargeCode`, `ubahChargeCode`, `buatRateCard`, `ubahRateCard`
- `ubahStatusAktif` MENOLAK bila `aktifBaru === false` tanpa alasan (nonaktif wajib alasan).
- Deduplikasi nama via `cariMirip` (src/lib/similarity) — return `miripDengan` di hasil action saat skor mirip > threshold.

### 3. Skema DB (src/db/schema/index.ts, sudah migrasi 0002)
- `vendors`: id, nama, legalName, npwp, vendorType (SHIPPING|CONT|TRUCKING|OTHERS),
  paymentTerm, paymentTermDays, pph23Default (boolean, default false),
  isActive (default true), audit fields (dibuatOleh/diubahOleh/dibuatPada/diubahPada).
- `customers`: id, nama, npwp, alamat, kota, kodePos, pic, telepon, email,
  isActive, audit fields. Term pembayaran customers: `paymentTermDays` +
  `paymentTerm` (kolom sama seperti vendors — verifikasi cepat saat coding
  hanya untuk customers bila ragu; ERD §customers).

### 4. Pola UI (tiru PERSIS)
- `src/app/master/ports/page.tsx`: server component,
  `requireRole(["ADMIN","OPERATOR"])`, `catatAudit` per render,
  cari `?q` (lower(nama) LIKE), urut asc, tabel + form cari + tombol tambah;
  aksi baris berupa `<a>` ke `/master/ports/<id>/edit` atau `?hapus=<id>`.
- `src/app/master/ship-lines/page.tsx`: sama + kolom Status (BadgeStatus)
  dan tombol toggle status inline (form POST kecil di dalam baris).
- `src/app/master/ports/form.tsx` & `ship-lines/form.tsx`: client component,
  `useActionState` membungkus server action, `router.push` kembali +
  `router.refresh()` saat sukses, `PeringatanMirip` untuk kandidat duplikat.
- `src/components/master/primitives.tsx`: `HalamanMaster`, `JudulHalaman`,
  `TabelMaster`, `BarisTabel`, `Sel`, `TombolPill`, `BadgeStatus`,
  `PesanHasil`, `Field`, `PeringatanMirip`, `kelasInput`, `kelasTombolSekunder`.
  Catatan: `TombolPill` mendukung `varian="merah"|"merusak"` untuk aksi nonaktif/hapus.

### 5. Konvensi penamaan & aturan terkait
- Rute: `/master/vendors` (SELESAI), `/master/customers` (berikutnya),
  `/master/charge-codes`, `/master/rate-cards`.
- Semua halaman master: role ADMIN + OPERATOR boleh kelola; audit wajib
  (catatAudit dengan entitas + keterangan berbahasa Indonesia).
- DOMAIN-RULES: pph23Default vendor adalah checkbox manual (JANGAN disimpulkan
  dari data lain); nonaktifkan vendor WAJIB alasan; aktifkan alasan opsional.
- Gate (dari TOOLCHAIN/RENCANA): `pnpm tsc --noEmit`, `pnpm vitest run`,
  `pnpm biome check -- .` harus hijau sebelum commit; commit message
  mengikuti konvensi `feat(master): ...`.

### 6. State terakhir repositori
- Commit terakhir sebelum sesi D4b: e2fbffe (semua gate hijau, Irisan 3 SESIB selesai).
- Commit sesi D4b: **110df3e** (vendors CRUD, gate hijau — hasil di atas).
- Tests saat itu: 15 files / 163 tests passed.
- `docs/HANDOFF-IRISAN-3-CRUD.md` dan `docs/RENCANA-IRISAN-3-CRUD.md` masih relevan;
  file ini menimpa versi sebelumnya dengan status paling mutakhir.
