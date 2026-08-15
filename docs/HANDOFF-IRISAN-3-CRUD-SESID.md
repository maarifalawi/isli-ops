# HANDOFF IRISAN 3 CRUD — SESI D4 (diperbarui Sesi D4c: koreksi fakta akses/otorisasi/audit; vendors SELESAI commit 110df3e)

> Status: **vendors CRUD selesai & ter-commit (110df3e), semua gate hijau**.
> Sesi D4c: dokumen ini dikoreksi dulu (lihat "KOREKSI FAKTA" di bawah),
> lalu customers dikerjakan mengikuti PERSIS pola vendors.

## KOREKSI FAKTA SESI D4c (WAJIB dibaca sebelum coding customers)

Dokumen ini sebelumnya memuat frasa keliru
`requireRole(ADMIN, OPERATOR) + catatAudit per render`.
Fakta yang SUDAH DIVERIFIKASI LITERAL di kode (commit 08c966e):

1. **Akses halaman**: pakai `requireUser()` (login saja, tanpa cek role di
   halaman). Tidak ada `requireRole` di `src/app/master/*/page.tsx`.
2. **Otorisasi mutasi sesungguhnya** ada di server action → fungsi lib
   `src/lib/master-data` yang memanggil `assertCan(user.role, "master:manage")`
   — hanya **OWNER + MANAGER** yang boleh; **STAFF ditolak** (bukan ADMIN/OPERATOR;
   peran ADMIN/OPERATOR tidak ada di sistem ini — lihat docs/RBAC.md).
3. **Audit** ditulis lewat `writeAudit()` di dalam `db.transaction` yang SAMA
   dengan mutasi — **1 baris per mutasi** (aksi CREATE/EDIT/NONAKTIFKAN/AKTIFKAN),
   **BUKAN per render**. Tidak ada catatAudit/writeAudit di page.tsx mana pun.
4. Actions master (`src/lib/actions/master.ts`) polanya: `"use server"` →
   `requireUser()` → fungsi lib (assertCan + transaction + writeAudit).
   Return type `HasilAction`: `{ ok: true; miripDengan?: Array<{id;nama;skor}> }`
   | `{ ok: false; error: string }` (tanpa field `message`).

## HASIL SESI D4b (commit 110df3e)

### Yang dibuat
- `src/app/master/vendors/page.tsx` — server component:
  `requireUser()`; cari `?q` (lower(nama) LIKE), urut nama asc; tabel kolom
  Nama, Tipe, Term (+hari), PPh23, **Status (BadgeStatus)**, Aksi; tombol
  "Tambah Vendor".
- `src/app/master/vendors/form.tsx` — client component:
  - `FormBuatVendor` / `FormUbahVendor`: useActionState + actionBuatVendor/
    actionUbahVendor; field nama (minLength 2), legalName, npwp, vendorType
    (SHIPPING/CONT/TRUCKING/OTHERS), paymentTerm (default TOP),
    paymentTermDays (default 30), checkbox pph23Default; PeringatanMirip
    tampil bila action kembalikan miripDengan; sukses tanpa mirip →
    router.push("/master/vendors") + refresh.
  - `FormNonaktifVendor`: form terpisah dengan field alasan WAJIB
    (minLength 3) + hidden aktifBaru=false → actionStatusVendor;
    dipicu `?nonaktif=<id>`.
  - `FormAktifkanVendor`: tombol inline di baris tabel, hidden aktifBaru=true
    (alasan opsional/skip) → actionStatusVendor.
- **Perhatian commit**: `BadgeStatus` yang dipakai vendors/page.tsx tidak ikut
  ter-commit di 110df3e (muncul lagi di working tree sesi D4c). Saat commit
  customers, pastikan `src/components/master/primitives.tsx` ikut di-stage
  agar file ter-commit konsisten.

### Gate D4b (semua hijau, hasil literal)
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

### Commit
```
110df3e feat(master): CRUD vendors - halaman daftar, form buat/ubah, nonaktif (alasan wajib)/aktifkan
```

## INSTRUKSI SESI BERIKUTNYA — customers

1. Kerjakan customers dengan pola PERSIS sama seperti vendors (jangan bikin
   pola baru). Template terdekat: `src/app/master/vendors/`.
2. Actions `actionBuatCustomer` / `actionUbahCustomer` / `actionStatusCustomer`
   sudah ada di `src/lib/actions/master.ts` — tinggal dipakai dari form.
3. Skema `customers` (sudah diverifikasi literal di src/db/schema/index.ts):
   id, nama (not null), npwp, **alamat, kota, pic, telepon**, isActive +
   audit fields (dibuatOleh/diubahOleh/dibuatPada/diubahPada).
   **TIDAK ADA kolom paymentTermDays/paymentTerm/email/kodePos** — tabel
   cukup kolom Nama | Status | Aksi (+npwp bila mau), form fields hanya
   nama/npwp/alamat/kota/pic/telepon.
4. Aksi baris: Nonaktifkan (alasan WAJIB) / Aktifkan (opsional) + Ubah —
   tiru vendors persis. Sertakan `src/components/master/primitives.tsx`
   (BadgeStatus) dalam commit.
5. Gate wajib sebelum commit: `pnpm tsc --noEmit`, `pnpm vitest run`,
   `pnpm biome check` (semua hijau, tempel hasil literal), lalu commit
   `feat(master): ...`. JANGAN pakai `autoFocus` (lint a11y noAutofocus).
6. Audit sudah ditangani lib: 1 baris `writeAudit()` per mutasi di dalam
   `db.transaction` yang sama — JANGAN menulis audit per render halaman.

---

## Fakta pendukung lain (terverifikasi sesi D4/D4c)

- Validasi di `src/lib/master-data/index.ts`: `buatCustomer`, `ubahCustomer`,
  `ubahStatusAktif` (shared; MENOLAK `aktifBaru=false` tanpa alasan).
  Deduplikasi nama via `cariMirip` (src/lib/similarity) — return
  `miripDengan` di hasil action saat skor > threshold.
- Primitif UI aktual di `src/components/master/primitives.tsx` (bukan nama
  lama HalamanMaster/TabelMaster): `HalamanJudul`, `PeringatanMirip`,
  `BadgeStatus`, `PesanHasil`, `TombolBukaForm`; pola dialog Tailwind
  `hidden` + `group-open:block` (tanpa komponen FormNonaktif generik).
- Konvensi rute: `/master/vendors` (SELESAI), `/master/customers` (berikutnya),
  `/master/charge-codes`, `/master/rate-cards`.
- Gate (TOOLCHAIN/RENCANA): `pnpm tsc --noEmit`, `pnpm vitest run`,
  `pnpm biome check -- .` hijau sebelum commit.

## State terakhir repositori
- Commit HEAD sesi D4c: `08c966e` + koreksi dokumen ini (commit terpisah).
- Working tree selain dokumen: hanya `src/components/master/primitives.tsx`
  (BadgeStatus yang terlewat dari commit 110df3e).
- Tests terakhir hijau: 15 files / 163 tests passed.
</content>
<parameter name="task_progress">- [x] Verifikasi pola vendors + actions + schema customer
- [x] Cek BadgeStatus di HEAD (hilang dari commit vendors = harus ikut ter-commit)
- [x] Koreksi frasa keliru di HANDOFF (write_to_file fallback)
- [ ] Commit koreksi dokumen
- [ ] STOP: context 95%+ — customers dikerjakan sesi berikutnya dengan instruksi terkoreksi