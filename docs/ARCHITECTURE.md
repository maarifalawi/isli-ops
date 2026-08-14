# ARCHITECTURE.md

> Bagaimana sistem disusun dan **kenapa**. Setiap keputusan besar punya ADR.
> Agent: kalau kamu ingin menyimpang dari struktur ini, buat ADR dulu.

## 1. Prinsip

1. **Boring is good.** Skala 19–100 job/bulan. Teknologi paling membosankan
   yang bisa jalan adalah pilihan yang benar.
2. **Domain logic tidak boleh ada di UI.** Semua aturan uang, pajak, dan status
   hidup di `src/domain/` sebagai fungsi murni yang bisa diuji tanpa database.
3. **Database adalah benteng terakhir.** Constraint kritikal ada di skema,
   bukan hanya di aplikasi.
4. **Server-first.** Perhitungan uang tidak pernah dilakukan di browser.
5. **Vertical slice.** Kerjakan satu alur tipis sampai tembus, bukan satu layer
   penuh. Lihat `BUILD-PLAN.md`.

## 2. Stack

| Layer | Pilihan | ADR |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript strict | ADR-0001 |
| Database | PostgreSQL (Supabase managed) | ADR-0001 |
| ORM / query | Drizzle ORM | ADR-0003 |
| Auth | Supabase Auth + tabel role sendiri | ADR-0004 |
| Validasi | Zod, dipakai bersama client & server | ADR-0003 |
| UI | Tailwind + shadcn/ui | ADR-0001 |
| Tabel data | TanStack Table | ADR-0001 |
| PDF invoice | React-PDF (render di server) | ADR-0005 |
| Test | Vitest (unit) + Playwright (e2e) | ADR-0001 |
| Uang | integer rupiah + helper terpusat | ADR-0002 |

## 3. Struktur folder

```
src/
  app/                        # routing Next.js
    (auth)/
    (dashboard)/
      jobs/
      invoices/
      vendor-invoices/
      reports/
      master/
    api/
  domain/                     # ⭐ INTI — fungsi murni, tanpa I/O
    money/                    # aritmetika rupiah
      money.ts
      money.test.ts
    tax/                      # PPN, PPh 23, DPP, reimburse
      ppn.ts
      pph23.ts
      tax.test.ts
    numbering/                # nomor job & invoice
      job-number.ts
      invoice-number.ts
      numbering.test.ts
    costing/                  # GP, pencadangan vs actual
      gp.ts
      gp.test.ts
    workflow/                 # state machine
      job-state.ts
      invoice-state.ts
      vendor-invoice-state.ts
    terbilang/
      terbilang.ts
      terbilang.test.ts
  services/                   # orkestrasi: domain + database, transaksional
    job.service.ts
    invoice.service.ts
    vendor-invoice.service.ts
    report.service.ts
  db/
    schema/                   # definisi tabel Drizzle
    migrations/               # file migrasi bernomor
    seed.ts
  lib/
    authz/policy.ts           # ⭐ satu-satunya sumber aturan RBAC
    audit/audit-log.ts
    format/                   # format angka & tanggal Indonesia
  components/
tests/
  golden/                     # ⭐ rekonsiliasi 75 job asli
  e2e/
```

### Aturan ketergantungan (dilarang dilanggar)

```
app/  ──>  services/  ──>  domain/
  │            │
  │            └──>  db/
  └──>  components/
```

- `domain/` **tidak boleh** mengimpor apa pun dari `db/`, `services/`, `app/`.
  Fungsi murni. Bisa diuji tanpa database.
- `components/` **tidak boleh** mengimpor `db/`.
- Perhitungan uang **hanya** di `domain/`.

## 4. Model data — keputusan inti

### 4.1 Charge line, bukan tiga kolom biaya

Pak Indra menjelaskan bisnis sebagai tiga segmen biaya (trucking, freight,
delivery). **Jangan modelkan seperti itu.** Job sheet asli punya 14–24 baris
biaya dari ≈40 charge code berbeda, masing-masing dengan vendor sendiri,
nomor invoice sendiri, dan status pajak sendiri.

```
SALAH:  jobs(cost_trucking, cost_freight, cost_delivery)
BENAR:  jobs 1──* charge_lines(side, charge_code, counterparty, amount, leg?)
```

`leg` tetap ada sebagai atribut opsional supaya laporan tiga-segmen ala
Pak Indra tetap bisa dibuat lewat agregasi.

### 4.2 Nomor job bukan primary key

16 tabrakan terbukti di data. Kunci unik: `(seq_scope, year, month, running)`.
`job_no` adalah kolom turunan untuk tampilan.

### 4.3 Uang = BIGINT

Rupiah tidak punya sen dalam praktik ISLI. Semua nominal integer.
Dilarang `NUMERIC`, dilarang `FLOAT`.

### 4.4 Angka pajak dibekukan di invoice

Invoice menyimpan hasil hitung pajaknya sendiri (`dpp`, `ppn`, `pph23`,
`grand_total`) plus versi aturan yang dipakai. Perubahan tarif di masa depan
tidak boleh mengubah invoice lama.

## 5. Alur permintaan

```
Browser
  │  Server Action / Route Handler
  v
authz/policy.ts        ← cek izin (deny by default)
  │
  v
services/*.service.ts  ← buka transaksi DB
  │
  ├─> domain/*         ← hitung (fungsi murni)
  ├─> db/*             ← baca/tulis
  └─> audit-log        ← catat perubahan (dalam transaksi yang sama)
  │
  v
commit → revalidate → response
```

**Invariant:** perubahan data dan penulisan audit log ada di **satu transaksi**.
Tidak boleh ada perubahan tanpa jejak.

## 6. Alokasi nomor tanpa tabrakan

```sql
BEGIN;
SELECT running FROM job_sequences
  WHERE scope=$1 AND year=$2 AND month=$3
  FOR UPDATE;                     -- kunci baris
UPDATE job_sequences SET running = running + 1 WHERE ...;
INSERT INTO jobs (...) VALUES (...);
COMMIT;
```

Ditambah `UNIQUE(seq_scope, year, month, running)` sebagai jaring pengaman.

## 7. Strategi test

| Tingkat | Alat | Cakupan |
|---|---|---|
| Unit | Vitest | `domain/` — pajak, GP, penomoran, terbilang. Target ≥ 80%. |
| **Golden** | Vitest | ⭐ 75 job asli + 2 invoice asli. **Gerbang wajib.** |
| Integrasi | Vitest + Postgres uji | service layer, transaksi, constraint |
| Authz | Vitest | setiap sel `✗` di `RBAC.md` terbukti ditolak |
| E2E | Playwright | alur: buat job → costing → approve → invoice |

### Golden test — kenapa ini yang terpenting

Sistem ini menggantikan Excel yang **terbukti salah**. Satu-satunya cara
membuktikan sistem baru benar adalah menjalankan data nyata melewatinya dan
membandingkan hasilnya baris per baris.

```
tests/golden/
  reconcile-jobs.test.ts      # 75 job -> GP harus cocok
  invoice-materee.test.ts     # harus menghasilkan 23.848.600 persis
  invoice-diametral.test.ts   # harus menghasilkan 131.429.434 persis
```

Test Diametral **akan gagal** sampai aturan pembulatan (Q05) terjawab.
Itu disengaja — test yang merah adalah pengingat bahwa ada pertanyaan terbuka.

## 8. Deployment

⚠️ Menunggu Q29.

Rekomendasi: Vercel + Supabase (managed Postgres, backup otomatis, tanpa perlu
IT internal). Alternatif kalau ada syarat data harus di dalam negeri: VPS
Indonesia + Docker Compose + backup terjadwal.

## 9. Yang sengaja TIDAK dipakai

| Ditolak | Alasan |
|---|---|
| Microservices | 19 job/bulan. Absurd. |
| Event sourcing | Audit log biasa sudah memenuhi kebutuhan. |
| GraphQL | Satu klien, satu server. Overhead tanpa manfaat. |
| Redis / cache | Belum ada masalah performa. Optimasi prematur. |
| Message queue | Tidak ada pekerjaan async yang butuh. |
| Prisma | Lihat ADR-0003. |
| Multi-tenant | Satu perusahaan. |
