# AGENTS.md — ISLI Operations System

> Dibaca otomatis oleh Cline, Claude Code, Codex, Cursor, Windsurf.
> Ini adalah **entry point**. Baca file ini dulu, lalu ikuti routing di bawah.

## Apa yang sedang kita bangun

Sistem operasional **PT. Integra Sinergi Logitama Indonesia (ISLI)**, sebuah
freight forwarder Indonesia. Sistem ini menggantikan proses manual berbasis
Excel untuk: pencatatan job, costing per job, approval berjenjang, penerbitan
invoice, pelacakan pembayaran vendor, dan pelaporan Gross Profit.

**Tujuan utama pemilik (Pak Indra), dikutip langsung:**

> "Saya itu punya mata satu pun nggak. Saya dari orang buta, kamu kasih mata
> satu, saya kebuka dikit."

Artinya: **visibilitas GP per job yang bisa dipercaya** adalah nilai inti.
Bukan fitur banyak. Bukan UI cantik. **Angka yang benar dan tidak bisa
diam-diam diubah.**

## Routing file — WAJIB dibaca sebelum bekerja

| Kalau kamu akan… | Baca dulu |
|---|---|
| Menyebut istilah domain apa pun | `docs/CONTEXT.md` |
| Menghitung uang, pajak, GP | `docs/DOMAIN-RULES.md` + `.clinerules/03-money-and-tax.md` |
| Membuat/mengubah tabel | `docs/ERD.md` + `docs/DATA-DICTIONARY.md` + ADR terkait |
| Menambah aturan akses | `docs/RBAC.md` |
| Mengubah alur status | `docs/STATE-MACHINE.md` |
| Memilih pendekatan teknis | `docs/adr/` (baca semua judulnya) |
| Mengerjakan task | `docs/BUILD-PLAN.md` |
| Menemukan hal yang tidak jelas | tulis ke `docs/OPEN-QUESTIONS.md`, **lalu BERHENTI** |

## Aturan mutlak

1. **JANGAN MENEBAK ATURAN BISNIS.** Kalau sebuah aturan tidak tertulis di
   `docs/DOMAIN-RULES.md`, jangan diimplementasikan. Tulis pertanyaannya di
   `docs/OPEN-QUESTIONS.md` dan berhenti. Domain ini penuh jebakan pajak
   Indonesia; tebakan yang terlihat masuk akal biasanya salah.
2. **JANGAN pakai float untuk uang.** Semua nominal = `BIGINT` rupiah.
3. **JANGAN hard delete** entitas transaksi. Semua perubahan masuk `audit_log`.
4. **JANGAN membuat istilah baru.** Pakai kosakata di `docs/CONTEXT.md`.
   Kalau butuh istilah baru, tambahkan ke `CONTEXT.md` dulu dengan definisi.
5. **JANGAN menyentuh `docs/source-of-truth/`.** Itu dokumen asli klien.
6. **Setiap fitur uang wajib punya test** yang memakai `fixtures/golden-jobs.csv`.

## Setup commands

```bash
pnpm install
pnpm db:up          # postgres lokal via docker
pnpm db:migrate
pnpm db:seed        # memuat fixtures/
pnpm dev
```

## Verifikasi (wajib hijau sebelum commit)

```bash
pnpm typecheck
pnpm lint
pnpm test           # unit + aturan pajak
pnpm test:golden    # rekonsiliasi 75 job real -> GP harus cocok
pnpm test:e2e
```

`pnpm test:golden` adalah gerbang paling penting. Kalau merah, jangan commit.

## Code style

- TypeScript strict. Tidak ada `any`.
- Nama variabel/fungsi/tabel **memakai istilah domain** dari `CONTEXT.md`
  (`chargeLine`, bukan `costItem`; `pencadangan`, bukan `estimate`).
- Istilah domain Indonesia dipertahankan apa adanya bila tidak ada padanan
  yang tepat (`pencadangan`, `terbilang`, `materai`, `dooring`).
- Server-side money helper wajib dipakai; dilarang aritmetika uang inline.

## Status proyek

**Fase saat ini: PRE-BUILD / DISCOVERY.**
Belum boleh menulis kode aplikasi sampai semua item 🔴 di
`docs/OPEN-QUESTIONS.md` terjawab. Lihat `docs/BUILD-PLAN.md` untuk gerbangnya.

---

## Status kepercayaan data sumber — wajib dibaca

Dokumen klien di `docs/source-of-truth/` adalah **data operasional asli** yang
diserahkan sebagai contoh. Dikonfirmasi klien pada 13 Agu 2026 dan didukung
metadata berkas (summary report berumur 15 bulan, invoice dikerjakan 349 menit,
catatan tangan difoto langsung dari meeting).

**Tapi ada dua batasan yang harus kamu hormati:**

1. **Contoh, bukan populasi lengkap.** 75 job di `fixtures/` bukan seluruh job
   ISLI. Jangan pernah menyebut total di sana sebagai "total GP ISLI".
2. **Belum diverifikasi.** File summary disimpan ulang tepat sebelum
   diserahkan. Kalau ada baris terhapus saat itu, referensi formula bergeser.
   Ini memblokir tiga temuan rekonsiliasi (**Q37**).

### Konsekuensi praktis

| Kategori | Boleh dipakai? |
|---|---|
| Struktur, format, penomoran, kosakata, aturan pajak | ✅ ya |
| Charge code, kombinasi leg, alur approval | ✅ ya |
| Nilai total GP per bulan / per segmen | ⏸️ tidak, sampai Q37 dijawab |
| Klaim "Excel klien salah Rp 22,5 juta" | ⏸️ tidak, sampai Q37 dijawab |

Golden test dipecah jadi **Tingkat A (struktural, wajib hijau)** dan
**Tingkat B (rekonsiliasi, ditahan)**. Lihat `.clinerules/04-testing.md`
dan `fixtures/README.md`.

Baca lengkapnya di `docs/SOURCE-PROVENANCE.md`.

---

## Skill vendor & urutan kewenangan

Repo ini membawa salinan `mattpocock/skills` (MIT) di `skills/vendor/mattpocock/`.
Skill itu ditulis untuk Claude Code dan Codex, bukan Cline. Cara memanggilnya ada di
`.clinerules/workflows/use-skill.md`. Daftar mana yang aktif dan mana yang ditunda ada
di `skills/README.md`.

**Urutan kewenangan kalau terjadi bentrok — dari paling tinggi:**

1. `.clinerules/` — aturan repo ini. Selalu menang.
2. `skills/isli-*/` — skill domain ISLI (pajak, job costing, render invoice).
3. `skills/vendor/mattpocock/` — skill proses umum.
4. Prior model.

Konkretnya:

- Kalau `engineering/tdd` bertabrakan dengan `.clinerules/04-testing.md`, ikuti
  `04-testing.md`. Larangan `toBeCloseTo` / `it.skip` atas golden test tidak bisa
  ditawar oleh skill mana pun.
- Kalau `engineering/domain-modeling` menawarkan menulis ulang `docs/CONTEXT.md`,
  **tolak**. Ia hanya boleh menambah.
- Kalau skill mana pun menawarkan mengubah angka di `fixtures/`, **tolak**. Angka itu
  berasal dari dokumen asli klien.
- Kalau skill mana pun menawarkan warna di luar `docs/DESIGN-SYSTEM.md`, **tolak**.

Kalau sebuah skill menyuruh sesuatu yang dilarang `.clinerules/`, hentikan dan bilang
ke Alawi skill mana dan aturan mana yang bertabrakan. Jangan diam-diam memilih salah satu.

## Toolchain

Apa yang boleh dipasang ada di `docs/TOOLCHAIN.md`. Di luar daftar itu butuh ADR baru.
Graphify sengaja ditunda — alasannya di `docs/adr/0008-graphify-ditunda.md`.
