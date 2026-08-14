---
description: Aturan perubahan skema database dan migrasi.
globs: ["src/db/**", "drizzle/**"]
---

# Migrasi Database

## Aturan dasar

1. **Setiap perubahan skema lewat file migrasi.** Dilarang mengubah database
   secara manual, dilarang `db push` di lingkungan selain lokal.
2. Migrasi **bernomor urut** dan masuk repo.
3. Migrasi **tidak pernah diedit** setelah dijalankan di staging/produksi.
   Kalau salah, buat migrasi baru yang memperbaiki.
4. Setiap migrasi harus bisa dijalankan pada database kosong dari nol.

## Constraint yang WAJIB ada

Ini bukan saran. Ini pencegah kerugian uang nyata.

```sql
-- Mencegah dobel bayar vendor (kasus 01A/01B dari transkrip)
ALTER TABLE vendor_invoice
  ADD CONSTRAINT uq_vendor_inv UNIQUE (vendor_id, vendor_invoice_no);

-- Mencegah nomor job kembar dalam scope yang sama
ALTER TABLE job
  ADD CONSTRAINT uq_job_number UNIQUE (seq_scope, year, month, running);

-- Mencegah kombinasi leg 1+3 tanpa 2 (R10)
ALTER TABLE job
  ADD CONSTRAINT ck_legs CHECK (
    NOT (leg_trucking AND leg_delivery AND NOT leg_freight)
  );

-- Nomor invoice unik per tipe per tahun
ALTER TABLE customer_invoice
  ADD CONSTRAINT uq_inv UNIQUE (inv_type, issue_year, running);

-- Audit log append-only
REVOKE UPDATE, DELETE ON audit_log FROM app_role;
```

## Tipe kolom

| Jenis data | Tipe | Catatan |
|---|---|---|
| Uang | `BIGINT` | rupiah penuh, ADR-0002 |
| Tarif pajak | `INTEGER` | basis poin, `110` = 1,1% |
| Persentase | jangan disimpan | hitung saat dibutuhkan |
| ID | `UUID` | |
| Tanggal | `DATE` | tanpa jam |
| Waktu | `TIMESTAMPTZ` | selalu with timezone |
| Enum | `TEXT` + `CHECK` | lebih mudah diubah daripada tipe ENUM Postgres |
| JSON | `JSONB` | hanya untuk audit log |

**Dilarang:** `FLOAT`, `DOUBLE PRECISION`, `REAL`, `MONEY`, `NUMERIC` untuk uang.

## Checklist sebelum migrasi

- [ ] Sudah baca `docs/ERD.md`
- [ ] Perubahan tercermin di `docs/ERD.md` pada commit yang sama
- [ ] Semua kolom uang `BIGINT`
- [ ] Constraint kritikal ada di skema, bukan hanya di aplikasi
- [ ] Ada index untuk kolom yang sering difilter
- [ ] Foreign key punya `ON DELETE` yang eksplisit
- [ ] Migrasi diuji pada database kosong
- [ ] Migrasi diuji pada database berisi data seed

## Migrasi yang mengubah data

Kalau migrasi memindahkan atau mengubah data yang sudah ada:

1. Tulis skrip verifikasi jumlah baris sebelum dan sesudah
2. Backup dulu
3. Jalankan dalam transaksi
4. Sertakan cara rollback di komentar migrasi

## Yang dilarang

| Larangan | Alasan |
|---|---|
| `DROP COLUMN` pada tabel transaksi | Data hilang permanen. Pakai deprecate dulu. |
| `DELETE` tanpa `WHERE` | — |
| Mengubah tipe kolom uang | Buat kolom baru, migrasikan, deprecate yang lama |
| Menghapus constraint karena mengganggu test | Constraint itu fitur, bukan hambatan |
| Migrasi tanpa test | — |
