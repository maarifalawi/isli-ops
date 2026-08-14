# ADR-0003: Drizzle ORM + Zod

- **Status:** Accepted
- **Tanggal:** 2026-08-13

## Konteks

Sistem ini butuh:
- Constraint database yang kuat (`UNIQUE(vendor_id, vendor_invoice_no)` adalah
  pencegah dobel bayar).
- Generated column (`selisih_idr`).
- Row-level locking untuk alokasi nomor.
- Transaksi multi-tabel.
- Validasi input yang sama di client dan server.

Agent AI akan menulis sebagian besar query. Kejelasan SQL yang dihasilkan
penting agar kesalahan mudah terlihat saat review.

## Keputusan

- **Drizzle ORM** untuk skema dan query.
- **Zod** untuk validasi, dipakai bersama client & server.
- Migrasi lewat `drizzle-kit`, file bernomor, masuk repo.

## Alasan

1. **SQL yang dihasilkan mudah dibaca.** Saat agent menulis query, hasilnya
   dekat dengan SQL asli sehingga bug lebih cepat ketahuan saat review.
2. **Skema didefinisikan sebagai TypeScript** dan langsung jadi tipe. Tidak ada
   langkah generate terpisah yang bisa lupa dijalankan.
3. **Kontrol penuh atas DDL.** `FOR UPDATE`, generated column, partial index,
   dan CHECK constraint semuanya bisa ditulis apa adanya.
4. **Zod sekali tulis, dipakai dua sisi.** Skema validasi yang sama menjaga
   form dan server action tetap konsisten.

## Yang ditolak

| Alternatif | Alasan |
|---|---|
| Prisma | Abstraksi lebih tebal; row-level lock dan generated column butuh raw SQL; migrasi kadang melakukan hal tak terduga pada constraint |
| TypeORM | Pola decorator kurang cocok dengan gaya fungsional `domain/` |
| Raw SQL saja | Tidak ada keamanan tipe; agent lebih mudah salah nama kolom |
| Kysely | Bagus, tapi ekosistem migrasi kurang matang dibanding drizzle-kit |

## Konsekuensi

- Setiap perubahan skema **wajib** lewat file migrasi. Dilarang mengubah
  database secara manual.
- Skema Zod tinggal bersama fitur, bukan di satu file raksasa.
- Query kompleks untuk laporan boleh memakai raw SQL Drizzle, tapi **wajib**
  ada test integrasinya.
