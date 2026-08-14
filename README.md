# ISLI Operations System — Repo Starter

Paket persiapan **pre-build** untuk sistem operasional
**PT. Integra Sinergi Logitama Indonesia (ISLI)**, freight forwarder.

> ⚠️ **Belum ada kode aplikasi di sini, dan itu disengaja.**
> Repo ini berisi dokumen, aturan, dan data uji yang harus lengkap **sebelum**
> baris kode pertama ditulis. Lihat `docs/BUILD-PLAN.md` → GERBANG 0.

---

## Kenapa repo ini ada

Pertanyaan awalnya: *"apa saja yang harus disiapkan sebelum vibe coding?"*

Jawabannya bukan daftar template. Jawabannya: **dokumen yang mencegah AI agent
menebak.** Setiap file di sini lahir dari satu temuan nyata di dokumen klien,
bukan dari template generik.

Contoh: kalau tidak ada `DOMAIN-RULES.md` yang menulis *"aturan PPh 23 belum
diketahui, jangan ditebak"*, agent akan menulis `pph23 = segment === "EXIM"`
karena itu pola yang terlihat di data. Dan itu **salah**.

---

## Isi

```
AGENTS.md                    ← entry point untuk semua AI agent

docs/
  CONTEXT.md                 ← kosakata bersama (paling penting)
  DOMAIN-RULES.md            ← aturan bisnis + status ✅⚠️🔴
  OPEN-QUESTIONS.md          ← 40 pertanyaan, 13 blocker
  SOURCE-PROVENANCE.md       ← asal-usul dokumen + batas kepercayaan data
  RECONCILIATION-REPORT.md   ← 9 temuan (6 struktural, 3 perlu konfirmasi)
  IDENTITAS-ISLI.md          ← identitas legal hasil bongkar kop surat
  PRD.md                     ← scope + non-goals
  NFR.md                     ← target terukur
  RBAC.md                    ← matriks 7 role
  STATE-MACHINE.md           ← semua transisi status
  ARCHITECTURE.md            ← struktur & prinsip
  ERD.md                     ← model data
  DATA-DICTIONARY.md         ← pemetaan Excel → sistem
  BUILD-PLAN.md              ← 10 slice + gerbang
  KUESIONER-DISCOVERY.md     ← dibawa ke meeting
  PROPOSAL-PHASES.md         ← untuk Pak Indra
  adr/                       ← 7 keputusan arsitektur
  source-of-truth/           ← dokumen asli klien (read-only)

.clinerules/                 ← aturan untuk Cline
  00-guardrails.md           ← kapan agent harus BERHENTI
  01-baca-dulu.md
  02-workflow.md
  03-money-and-tax.md
  04-testing.md
  05-ui-conventions.md
  06-db-migrations.md
  workflows/                 ← 5 workflow slash-command

skills/                      ← 3 skill domain-specific
  isli-tax-rules/
  isli-job-costing/
  isli-invoice-render/

fixtures/                    ← data uji dari data asli
  golden-jobs.csv            ← 75 job real
  golden-job-reimburse.csv
  charge-codes.csv           ← 43 kode
  customers-raw.csv          ← perlu dilengkapi NPWP
  vendors-raw.csv
```

---

## Cara pakai dengan Cline

### 1. Taruh di repo
```bash
unzip isli-ops-starter.zip
cd isli-ops
git init && git add . && git commit -m "chore: pre-build documentation"
```

Cline membaca `AGENTS.md` dan seluruh `.clinerules/` secara otomatis.

### 2. Pasang skill Matt Pocock (opsional tapi disarankan)
```bash
npx skills@latest add mattpocock/skills
```
Lalu jalankan `/setup-matt-pocock-skills`.

Yang relevan untuk proyek ini: `/grill-with-docs`, `/tdd`, `/diagnosing-bugs`,
`/improve-codebase-architecture`.

Skill di folder `skills/` adalah tambahan **khusus domain ISLI** yang tidak
mungkin ada di paket mana pun.

### 3. Uji dokumentasinya sebelum coding
Di Cline, Plan Mode:
```
Baca AGENTS.md dan semua dokumen di docs/.
Lalu grill saya: cari lubang, kontradiksi, dan hal yang belum diputuskan.
Jangan menulis kode.
```

Kalau Cline menemukan lubang — bagus, perbaiki dokumennya dulu.
Memperbaiki dokumen itu murah. Memperbaiki kode yang salah itu mahal.

### 4. Baru mulai slice
```
/new-slice.md
```

---

## 🚨 Sebelum menulis kode

Baca `docs/OPEN-QUESTIONS.md`. Ada **13 pertanyaan blocker**.

Tiga yang paling menentukan:

1. ~~**Q01 — gsoft itu apa?**~~ ✅ **TERTUTUP 13 Agu 2026.**
   Sistem di perusahaan Pak Indra sebelumnya. Tidak ada kaitan dengan ISLI.
   **Proyek ini greenfield.** Blocker pengganti: **Q41 — berkas `SO BULAN *.xlsx`**.

2. **Q04 — kapan PPh 23 dipotong?**
   Satu customer dipotong 2%, satu tidak. Tidak ada yang tahu aturannya.

3. **Q06 — boleh tidak memindahkan biaya antar job?**
   Catatan meeting menunjukkan biaya digeser antar job dengan alasan tertulis
   *"KARENA GP 7,27%"*. Ini menentukan apakah sistem menghasilkan angka jujur
   atau tidak.

---

## Temuan utama dari audit dokumen

> ⚠️ **Baca `docs/SOURCE-PROVENANCE.md` dulu.** Dokumen sumber adalah data
> operasional **asli** yang diserahkan sebagai contoh — dikonfirmasi klien dan
> didukung metadata berkas. Tapi temuan **1–3 bergantung pada nilai** dan perlu
> konfirmasi Bu Niken (**Q37**) sebelum dipakai sebagai klaim ke Pak Indra.
> Temuan **4–9 struktural** dan sudah pasti berlaku.

| # | Temuan | Nilai |
|---|---|---|
| 1 | `SUMMARY 2026!F19` merujuk sel yang salah | **Rp 22.500.000** |
| 2 | `DOM!Q91` tidak sama dengan `O91−P91` | **Rp 10.200.000** |
| 3 | Total GP Apr–Jul dilaporkan 257,65 jt, seharusnya 280,15 jt | selisih 22,5 jt |
| 4 | 16 tabrakan nomor job antar segmen | integritas data |
| 5 | Satu job punya 2 versi costing | GP 15,57% vs 9,12% |
| 6 | Rumus NETT memasukkan PPN ke margin | salah akuntansi |
| 7 | Reimburse asimetris di rumus GP | GP understated |
| 8 | ETD tertulis tahun 2006 | tidak ada validasi |
| 9 | Setiap job = satu file Excel terpisah | rawan broken link |

Detail lengkap + bukti formula ada di `docs/RECONCILIATION-REPORT.md`.

---

## Prinsip yang dipegang repo ini

1. **Dokumen yang jujur soal ketidaktahuan** lebih berharga daripada dokumen
   yang terlihat lengkap. Karena itu ada tanda 🔴 di mana-mana.
2. **Golden test dari data asli** adalah satu-satunya bukti sistem benar.
3. **Scope yang dijaga ketat.** Proyek sebelumnya gagal karena scope creep.
   Daftar OUT OF SCOPE di `PRD.md` adalah pertahanan utama.
4. **Agent harus berhenti, bukan menebak.** Itu inti seluruh `.clinerules/`.

---

## Status

| Fase | Status |
|---|---|
| Phase 0 — Discovery & dokumentasi | 🟡 berjalan, menunggu 12 jawaban |
| Phase 1 — Build | 🔴 diblokir GERBANG 0 |
| Phase 2 — AR/AP & pajak | — |
| Phase 3 — Integrasi keuangan | — |
