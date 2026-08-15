# HANDOFF IRISAN 3 CRUD — SESI D4d (customers SELESAI commit 39ae5eb; dokumen sudah dikoreksi commit a2bb255)

> Status sesi ini: **customers CRUD selesai & ter-commit (39ae5eb), semua gate
> hijau**. Koreksi fakta akses/otorisasi/audit sudah di-commit (a2bb255).
> Sesi berikutnya: **charge-codes + hub** (JANGAN dikerjakan sebelum sesi itu).

## Fakta akses/otorisasi/audit (TERVERIFIKASI LITERAL — dipertahankan dari D4c)

1. **Akses halaman**: `requireUser()` (login saja, tanpa cek role di halaman).
   Tidak ada `requireRole` di `src/app/master/*/page.tsx`.
2. **Otorisasi mutasi sesungguhnya** ada di server action → lib
   `src/lib/master-data` memanggil `assertCan(user.role, "master:manage")`
   — hanya **OWNER + MANAGER**; **STAFF ditolak**. Tidak ada peran
   ADMIN/OPERATOR di sistem ini (lihat docs/RBAC.md).
3. **Audit** ditulis lewat `writeAudit()` di dalam `db.transaction` yang SAMA
   dengan mutasi — **1 baris per mutasi** (CREATE/EDIT/NONAKTIFKAN/AKTIFKAN),
   **BUKAN per render**. Tidak ada writeAudit di page.tsx mana pun.
4. Pola actions (`src/lib/actions/master.ts`): `"use server"` → `requireUser()`
   → fungsi lib (assertCan + transaction + writeAudit). Return `HasilAction`.

## HASIL SESI D4d — customers

### Commit
```
a2bb255 docs(iris3): koreksi fakta akses/otorisasi/audit di HANDOFF SESID
39ae5eb feat(master): CRUD customers - halaman daftar, form buat/ubah, nonaktif (alasan wajib)/aktifkan
37a3a72 feat(master): tambah BadgeStatus primitive dipakai halaman customers
```

### Yang dibuat
- `src/app/master/customers/page.tsx` — server component: `requireUser()`;
  `daftarCustomer(db)`; tabel kolom **Nama | TOP (hari) | PPh23 | Status
  (BadgeStatus) | Aksi**; dialog edit via `?edit=<id>`, nonaktif via
  `?nonaktif=<id>`; reaktivasi tombol Aktifkan inline.
- `src/app/master/customers/form.tsx` — client component:
  - `FormBuatCustomer` / `FormUbahCustomer`: useActionState +
    `actionBuatCustomer`/`actionUbahCustomer`; field nama (minLength 2),
    legalName, npwp, alamat, topHari (default 30), checkbox pph23Default
    (DOMAIN-RULES R3.5: JANGAN disimpulkan dari data lain);
    `PeringatanMirip` tampil bila action kembalikan `miripDengan`; sukses
    tanpa mirip → `router.push("/master/customers")` + refresh.
  - `FormNonaktifCustomer`: hidden `aktifBaru=false` + field alasan WAJIB
    (minLength 3) → `actionStatusCustomer`; dipicu `?nonaktif=<id>`.
  - `FormAktifkanCustomer`: tombol inline di baris tabel, hidden
    `aktifBaru=true` (alasan opsional) → `actionStatusCustomer`.
- `BadgeStatus` (primitives.tsx) yang terlewat dari commit vendors 110df3e
  kini sudah ter-commit (37a3a72).

### Gate (semua hijau, hasil literal)
```
$ pnpm tsc --noEmit
(exit 0, tanpa output error)

$ pnpm biome check src/app/master/customers src/components/master
Checked 48 files. No fixes applied. / Checked 2 files. No fixes applied.
(exit 0)

$ pnpm vitest run
 Test Files  15 passed (15)
      Tests  163 passed (163)
(exit 0)
```

## INSTRUKSI SESI BERIKUTNYA — charge-codes + hub

1. Kerjakan **charge-codes** lalu **hub master** mengikuti pola PERSIS sama
   dengan vendors/customers (jangan bikin pola baru). Template:
   `src/app/master/vendors/` dan `src/app/master/customers/`.
2. Tambahkan `actionBuatChargeCode` dsb. + fungsi lib `buatChargeCode`/
   `ubahChargeCode` di `src/lib/master-data` dengan pola yang sama:
   assertCan + transaction + writeAudit (1 baris per mutasi).
3. Gate wajib sebelum commit: `pnpm tsc --noEmit`, `pnpm vitest run`,
   `pnpm biome check` — semua hijau, tempel hasil literal.
4. Jangan lupa sertakan semua file primitive yang dipakai dalam commit.

## Fakta pendukung (tetap berlaku)

- Validasi lib: `buatCustomer`, `ubahCustomer`, `ubahStatusAktif` (shared;
  MENOLAK `aktifBaru=false` tanpa alasan). Dedup nama via `cariMirip`
  (src/lib/similarity) — return `miripDengan` saat skor > threshold.
- Primitif UI di `src/components/master/primitives.tsx`: `HalamanJudul`,
  `PeringatanMirip`, `BadgeStatus`, `PesanHasil`, `Field`, `TombolPill`,
  `kelasInput`, `kelasTombolSekunder`; pola dialog searchParams (tanpa
  komponen FormNonaktif generik).
- Rute: `/master/vendors` ✅, `/master/customers` ✅,
  `/master/charge-codes` (berikutnya), `/master/rate-cards`.
- JANGAN pakai `autoFocus` (lint a11y noAutofocus).

## State terakhir repositori
- HEAD: `37a3a72` (BadgeStatus). Working tree bersih.
- Tests terakhir hijau: 15 files / 163 tests passed.
