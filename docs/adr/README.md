# Architecture Decision Records

Catatan keputusan arsitektur. **Append-only** — ADR lama tidak diedit.
Kalau keputusan berubah, buat ADR baru yang menggantikan (superseded).

## Daftar

| # | Judul | Status |
|---|---|---|
| [0001](0001-stack-dan-arsitektur.md) | Stack & arsitektur dasar | ✅ Accepted |
| [0002](0002-uang-integer-rupiah.md) | Uang sebagai integer rupiah | ✅ Accepted |
| [0003](0003-drizzle-dan-zod.md) | Drizzle ORM + Zod | ✅ Accepted |
| [0004](0004-authz-terpusat.md) | Otorisasi terpusat | ✅ Accepted |
| [0005](0005-pdf-invoice-server-side.md) | PDF invoice di server | ✅ Accepted |
| [0006](0006-pemindahan-biaya-antar-job.md) | Pemindahan biaya antar job | 🔴 **Proposed — blokir Slice 4** |
| [0007](0007-definisi-gp-dan-ppn.md) | Definisi GP & perlakuan PPN | 🔴 **Proposed — blokir Slice 1 & 4** |

## Status

- **Proposed** — diusulkan, belum disetujui. **Agent tidak boleh implementasi.**
- **Accepted** — disetujui, wajib diikuti.
- **Superseded by ADR-XXXX** — digantikan.
- **Deprecated** — tidak berlaku, tidak ada pengganti.

## Kapan membuat ADR baru

- Menambah/mengganti dependency besar
- Mengubah model data secara fundamental
- Mengubah aturan perhitungan uang atau pajak
- Mengubah scope yang tertulis di `PRD.md`
- Menyimpang dari struktur di `ARCHITECTURE.md`

## Template

```markdown
# ADR-XXXX: Judul

- Status: Proposed
- Tanggal: YYYY-MM-DD

## Konteks
Apa situasinya. Sertakan bukti/data, bukan opini.

## Keputusan
Apa yang diputuskan. Spesifik dan bisa diverifikasi.

## Alasan
Kenapa ini, bukan yang lain.

## Yang ditolak
Alternatif + alasan penolakan.

## Konsekuensi
Positif dan negatif. Jujur soal negatifnya.
```
