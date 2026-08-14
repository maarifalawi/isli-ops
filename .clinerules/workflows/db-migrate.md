# Workflow: Buat Migrasi Database

Jalankan dengan `/db-migrate.md`.

## Langkah

### 1. Baca dulu
```
docs/ERD.md
docs/DATA-DICTIONARY.md
.clinerules/06-db-migrations.md
docs/adr/0003-drizzle-dan-zod.md
```

### 2. Cek apakah tabelnya diblokir

Tabel berikut **belum boleh dibuat** (lihat `docs/ERD.md` bagian DITUNDA):
- `cost_reallocation` — menunggu ADR-0006
- ~~`gsoft_mapping`~~ — ❌ DIBATALKAN PERMANEN 13 Agu 2026. Jangan dibuat.
- `cash_dropping` — Phase 2
- `attachment` — menunggu Q21

### 3. Rencanakan

Tampilkan ke user sebelum menulis:
- DDL lengkap
- Constraint yang ditambahkan
- Index yang ditambahkan
- Dampak ke tabel lain
- Apakah ada data existing yang perlu dimigrasikan

### 4. Checklist wajib

- [ ] Semua kolom uang `BIGINT` (bukan NUMERIC, bukan FLOAT)
- [ ] Tarif pajak `INTEGER` basis poin
- [ ] Waktu `TIMESTAMPTZ`, tanggal `DATE`
- [ ] Enum pakai `TEXT` + `CHECK`
- [ ] Foreign key punya `ON DELETE` eksplisit
- [ ] Constraint kritikal ada di skema
- [ ] Index untuk kolom yang sering difilter
- [ ] Nama tabel & kolom pakai istilah `docs/CONTEXT.md`

### 5. Tulis

```bash
# ubah src/db/schema/*.ts
pnpm drizzle-kit generate
# periksa SQL yang dihasilkan SECARA MANUAL sebelum dijalankan
pnpm db:migrate
```

> **Selalu baca SQL hasil generate.** drizzle-kit kadang menghasilkan
> `DROP` yang tidak diinginkan saat mengubah constraint.

### 6. Uji

```bash
pnpm db:reset && pnpm db:migrate && pnpm db:seed   # dari nol
pnpm test                                          # integrasi
pnpm test:golden                                   # rekonsiliasi
```

### 7. Update dokumen

Update `docs/ERD.md` di **commit yang sama**. Skema dan dokumen tidak boleh
berbeda walau sebentar.
