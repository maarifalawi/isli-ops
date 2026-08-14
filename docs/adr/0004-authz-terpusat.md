# ADR-0004: Otorisasi Terpusat di Satu File Policy

- **Status:** Accepted
- **Tanggal:** 2026-08-13

## Konteks

Pak Indra meminta eksplisit:
> *"Ada hierarki, mana yang cuma punya saya, mana yang punya manajer, mana yang
> staf bisa lakukan."*

Bu Niken meminta:
> *"Hanya level tertentu yang boleh mengganti, dengan tahapan."*

Ada 7 role dan puluhan aksi. Bila pengecekan izin tersebar di komponen UI dan
route handler, akan mustahil membuktikan bahwa semuanya benar — dan agent AI
akan menyalin pola yang salah.

## Keputusan

1. **Satu file:** `src/lib/authz/policy.ts` adalah satu-satunya sumber aturan.
2. **Deny by default.** Aksi yang tidak terdaftar = ditolak.
3. **Cek di server** pada setiap mutasi. Menyembunyikan tombol di UI hanya
   kosmetik, bukan kontrol.
4. **Segregation of duty** ditegakkan di service layer: approver ≠ maker.
5. Setiap sel `✗` di `docs/RBAC.md` **wajib** punya test yang membuktikannya.

```ts
// bentuk yang dituju
export type Action =
  | "job.create" | "job.approve_l1" | "job.approve_final"
  | "job.unlock_grant" | "invoice.issue" | "vendor_invoice.pay"
  // ...

export function can(user: AppUser, action: Action, resource?: Resource): boolean
export function assertCan(user: AppUser, action: Action, resource?: Resource): void
```

Semua service **memanggil `assertCan` di baris pertama**. Tidak ada pengecualian.

## Alasan

- Auditor (dan Bu Niken) bisa membaca satu file untuk memverifikasi semua aturan.
- Agent AI hanya perlu diarahkan ke satu tempat saat menambah aksi baru.
- Matriks di `RBAC.md` dan kode di `policy.ts` bisa diuji kesesuaiannya secara
  otomatis.

## Konsekuensi

- Menambah aksi baru = ubah `RBAC.md` **dan** `policy.ts` **dan** tambah test.
  Tiga langkah, sengaja dibuat sedikit merepotkan agar tidak asal tambah.
- File `policy.ts` akan panjang. Itu diterima; lebih baik panjang di satu tempat
  daripada pendek di tiga puluh tempat.
