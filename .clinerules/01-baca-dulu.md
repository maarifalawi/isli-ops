---
description: Dokumen yang wajib dibaca sebelum mulai kerja, dipetakan per jenis task.
alwaysApply: true
---

# Baca Dulu — Routing Dokumen

Jangan mulai menulis kode sebelum membaca dokumen yang relevan.
Membaca 3 file itu murah. Menulis logika pajak yang salah itu mahal.

## Selalu baca (setiap task)

1. `AGENTS.md`
2. `docs/CONTEXT.md` — kosakata
3. `.clinerules/00-guardrails.md`

## Berdasarkan jenis task

### Menyentuh uang, pajak, atau GP
```
docs/DOMAIN-RULES.md          (bagian R3, R4)
docs/adr/0002-uang-integer-rupiah.md
docs/adr/0007-definisi-gp-dan-ppn.md    ← masih Proposed, cek statusnya
.clinerules/03-money-and-tax.md
skills/isli-tax-rules/SKILL.md
```

### Menyentuh nomor job atau invoice
```
docs/DOMAIN-RULES.md          (bagian R1, R2)
docs/ERD.md                   (tabel job_sequence)
```

### Menyentuh database
```
docs/ERD.md
docs/DATA-DICTIONARY.md
docs/adr/0003-drizzle-dan-zod.md
.clinerules/06-db-migrations.md
```

### Menyentuh status atau approval
```
docs/STATE-MACHINE.md
docs/DOMAIN-RULES.md          (bagian R6)
```

### Menyentuh hak akses
```
docs/RBAC.md
docs/adr/0004-authz-terpusat.md
```

### Menyentuh invoice atau PDF
```
docs/DOMAIN-RULES.md          (bagian R2, R3, R12)
docs/adr/0005-pdf-invoice-server-side.md
skills/isli-invoice-render/SKILL.md
docs/source-of-truth/          (2 invoice asli sebagai acuan visual)
```

### Menyentuh costing atau charge line
```
docs/DOMAIN-RULES.md          (bagian R4, R5)
skills/isli-job-costing/SKILL.md
docs/adr/0006-pemindahan-biaya-antar-job.md   ← masih Proposed
fixtures/charge-codes.csv
```

### Menulis importer atau migrasi data
```
docs/DATA-DICTIONARY.md
docs/RECONCILIATION-REPORT.md
fixtures/golden-jobs.csv
```

## Cara membaca yang benar

- Baca **seluruh** bagian yang relevan, jangan hanya judulnya.
- Perhatikan tanda status: ✅ aman, ⚠️ hati-hati, 🔴 berhenti.
- Kalau dokumen bertentangan dengan permintaan user → **dokumen menang**,
  lalu konfirmasi ke user.
- Kalau dokumen saling bertentangan → berhenti, laporkan.
