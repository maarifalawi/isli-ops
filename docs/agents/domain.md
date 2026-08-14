# Tata letak dokumen domain

Hasil `setup-matt-pocock-skills` Bagian C.

## Keputusan: **single-context**

Satu aplikasi, satu konteks. Bukan monorepo.

| Peran | Berkas kita | Nama yang dipakai skill upstream |
|---|---|---|
| Bahasa bersama / glosarium | `docs/CONTEXT.md` | `CONTEXT.md` |
| Catatan keputusan arsitektur | `docs/adr/` | `docs/adr/` |
| Peta multi-konteks | — tidak ada | `CONTEXT-MAP.md` |

Catatan: skill upstream mengharap `CONTEXT.md` di **akar repo**. Punya kita di
`docs/CONTEXT.md`. Kalau sebuah skill mencari di akar dan tidak ketemu lalu menawarkan
membuat yang baru — **tolak**, arahkan ke `docs/CONTEXT.md`.

## Aturan konsumen

Siapa pun (manusia atau agen) yang mulai sesi baru membaca dalam urutan ini:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/DOMAIN-RULES.md`
4. `docs/OPEN-QUESTIONS.md`

Urutan penuh untuk Cline ada di `docs/PROMPT-CLINE.md` PROMPT 0.

## Aturan penulis

- **`docs/CONTEXT.md` hanya boleh ditambah, tidak boleh ditulis ulang.** Isinya hasil
  membedah 7 dokumen sumber asli (transkrip, 2 xlsx, 2 invoice docx, kop, catatan
  tulisan tangan). Menulis ulang = membuang kerja itu.
- ADR baru pakai format di
  `skills/vendor/mattpocock/engineering/domain-modeling/ADR-FORMAT.md`, kecuali di mana
  ia bentrok dengan gaya ADR-0001..0008 kita — dalam hal itu ikuti gaya kita.
- Istilah dagang (`job`, `trucking`, `dooring`, `THC`, `LSS`, `POD`, `FCL`, `LCL`,
  `TOP`, `GP`, `NETT`) **tidak diterjemahkan**, di dokumen maupun di UI.

## Format glosarium

Lihat `skills/vendor/mattpocock/engineering/domain-modeling/CONTEXT-FORMAT.md`.
Bentuknya cocok dengan `docs/CONTEXT.md` yang sudah ada — satu istilah, satu definisi,
satu contoh dari data ISLI asli.
