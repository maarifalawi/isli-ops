# HANDOFF IRISAN 2 — Penomoran Job & Invoice

Status: rencana DISETUJUI user, BELUM ada kode ditulis. Jalankan urutan di bawah persis.

## Rencana yang disetujui

Mekanisme lock: **UPSERT `INSERT ... ON CONFLICT DO UPDATE SET last_running = job_sequence.last_running + 1 RETURNING last_running` di dalam satu `db.transaction`**.
Alasan: serialisasi penuh oleh row-level lock pada baris counter; tidak butuh advisory lock; tidak ada `MAX(nomor)+1` tanpa lock. Alokasi nomor HANYA terjadi di dalam transaksi yang sama dengan INSERT job/invoice.

## Temuan kritis (WAJIB masuk irisan ini)

1. `customer_invoices` TIDAK punya kolom `issue_month` — R2.2 (Romawi = bulan invoice, BUKAN bulan job) tidak bisa di-enforce. Tambah kolom `issue_month SMALLINT NOT NULL`, backfill dari `EXTRACT(MONTH FROM issue_date)`.
2. Index `uqInv` sekarang `(inv_type, issue_year, running)` — BERTENTANGAN dengan reset bulanan R2.4. Dua invoice 001-INVDOM dari bulan berbeda akan collision. Ganti jadi `(inv_type, issue_year, issue_month, running)`: DROP index lama + CREATE baru (migrasi manual SQL, bukan db:push; lihat `.clinerules/06-db-migrations.md`).

## Langkah eksekusi

1. **Skema drizzle** (`src/db/schema/index.ts`):
   - Tabel `job_sequence`: `seq_scope TEXT CHECK IN ('DOM','EXP','IMP')`, `tahun SMALLINT`, `bulan SMALLINT`, `last_running INT NOT NULL DEFAULT 0`; PK composite `(seq_scope, tahun, bulan)`. Sesuai ERD.md.
   - Tabel `invoice_sequence`: `inv_type TEXT CHECK IN ('INVDOM','INVEXP','INVIMP')`, `issue_year SMALLINT`, `issue_month SMALLINT`, `last_running INT NOT NULL DEFAULT 0`; PK composite `(inv_type, issue_year, issue_month)`.
   - `customerInvoices`: tambah `issueMonth` + ganti `uqInv`.
   - `pnpm db:generate` → BACA SQL-nya → `pnpm db:migrate`.
2. **Backfill counter** dari data yang ada:
   - `job_sequence`: `INSERT ... SELECT seq_scope, tahun, bulan, MAX(running) FROM jobs GROUP BY 1,2,3` (jobs menyimpan scope/tahun/bulan/running terpisah).
   - `invoice_sequence`: `SELECT inv_type, issue_year, EXTRACT(MONTH FROM issue_date), MAX(running) FROM customer_invoices GROUP BY ...`.
   - **TUNJUKKAN hasil backfill ke user sebelum lanjut** (query verifikasi SELECT * dari kedua tabel sequence).
3. **Allocator** (`src/lib/job-number/index.ts` atau file baru yang di-export dari sana):
   - `allocateJobNumber(tx, { scope, tahun, bulan }): Promise<number>` — UPSERT di atas, return `last_running`. Format dengan `formatJobNumber` yang sudah ada (149 baris, sudah benar: `ISLI-YY.MM-NNN`, running 1-999).
   - `allocateInvoiceNumber(tx, { invType, issueYear, issueMonth }): Promise<number>` — pola sama. Format dengan `formatInvoiceNumber` yang sudah ada (`NNN-TIPE/jobNo/ROMAWI/YYYY`).
   - `invoiceTypeForScope(scope)` sudah ada: DOM→INVDOM, EXP→INVEXP, IMP→INVIMP.
4. **Test**:
   - Unit: Romawi I..XII; job Juli di-invoice Agustus → `VIII` (bukan VII); format/parse sudah ada test-nya.
   - Integrasi (butuh DATABASE_URL): 50 `Promise.all` alokasi scope sama dalam transaksi terpisah → 50 nomor unik 001..050, 0 duplikat; regresi `ISLI-26.05-001` DOM dan EXP hidup bersamaan; ganti bulan → kembali 001; ganti tahun → YY berubah.
5. **Verifikasi**: test integrasi hijau 3x berturut-turut, lalu `pnpm verify`.

## Larangan (dari user)

- DILARANG ambil nomor di luar transaksi; DILARANG `MAX(nomor)+1` tanpa lock; DILARANG simpan counter di memori aplikasi; DILARANG UUID/timestamp sebagai pengganti counter.
- DILARANG mengarang aturan job dibatalkan — itu Q16, belum dijawab. Kalau desain terbentur ke sana: BERHENTI dan tanya user.

## Referensi cepat

- Aturan: `docs/DOMAIN-RULES.md` R1.1–R1.5, R2.1–R2.4.
- ERD: `docs/ERD.md` bagian `job_sequence`.
- Alur migrasi: `.clinerules/06-db-migrations.md` (generate → baca SQL → migrate; `db:push` DILARANG).
- DB client: `src/db/index.ts` (postgres-js, pool max 10, `prepare:false`).
- Koneksi test konkurensi: pool max 10 dengan 50 Promise.all tetap cukup — postgres-js mengantre di luar pool; serialisasi justru diuji di level row lock DB.
