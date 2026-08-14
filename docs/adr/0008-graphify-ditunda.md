# ADR-0008 — Graphify ditunda sampai Irisan 6

- Status: **Accepted**
- Tanggal: 2026-08-13

## Konteks

Graphify (Graphify-Labs/graphify v8, YC S26) diusulkan dengan alasan "biar AI kalau
disuruh revisi tidak baca ulang dari awal, jadi hemat token."

Gua bongkar isi repo-nya. Pemahaman itu **sebagian benar, sebagian keliru**, dan
kekeliruannya penting.

### Apa yang sebenarnya dilakukan graphify

Ia memetakan proyek jadi **knowledge graph** (`graph.json`) yang bisa di-*query*
sebagai ganti *grep*. Kode diurai lokal pakai tree-sitter AST — deterministik, tanpa
LLM, nol kredit. Dokumen/PDF/gambar diurai lewat *semantic pass* yang **memakai LLM**.

Outputnya tiga berkas: `graph.html`, `GRAPH_REPORT.md`, `graph.json`.
Perintahnya `graphify query`, `graphify path A B`, `graphify explain X`.

### Di mana pemahaman "hemat token" itu meleset

1. **`--update` menghemat biaya *build*, bukan konteks obrolan.** Bendera
   `--update` hanya mengekstrak ulang berkas yang berubah. Itu menghemat ongkos
   membangun grafnya. Ia tidak membuat agen "ingat" sesi sebelumnya.
2. **Penghematan sesungguhnya ada di sisi *retrieval*** — agen menanyai satu graf
   alih-alih membaca 40 berkas. Nyata, tapi hanya terasa kalau berkasnya memang banyak.
3. **README-nya sendiri memperingatkan graphify bisa MENAIKKAN biaya.** Kutipan
   langsung dari dokumentasinya: menulis `graph.json` / `graphify-out/` ke dalam
   workspace **membatalkan prompt cache**, memaksa unggah ulang penuh dengan tarif
   cache-write di giliran berikutnya. Wajib masuk ignore file. Kalau tidak, hasilnya
   kebalikan dari yang diharapkan.

### Kenapa belum sekarang

- **Repo ini punya nol baris kode sumber.** 88 berkas, semuanya dokumen. Jalur
  gratis-dan-lokal (tree-sitter AST atas kode) tidak punya bahan. Yang tersisa cuma
  jalur semantik atas dokumen — yang justru **membakar token**.
- Dokumen kita sudah punya peta manual yang lebih tajam: `docs/CONTEXT.md`,
  `AGENTS.md`, dan urutan baca di `docs/PROMPT-CLINE.md` PROMPT 0. Untuk 20 dokumen,
  indeks tulisan tangan mengalahkan graf yang diturunkan mesin.
- **Graphify tidak menargetkan Cline.** `install.py` menulis skill ke Claude Code,
  Gemini, Copilot, Antigravity, Kiro, dan ada `command-kilo.md` untuk Kilo Code.
  Tidak ada jalur Cline. Perlu pemasangan manual.

## Keputusan

Tunda. Pasang saat **Irisan 6** — ketika `src/` sudah lewat ±150 berkas TypeScript
dan menjawab "di mana PPh 23 dihitung?" mulai butuh lebih dari satu grep.

Saat dipasang, syaratnya:

```gitignore
graphify-out/
graph.json
```

dan jalankan **hanya atas `src/`**, dengan `--update`, bukan atas `docs/`.

```bash
uv tool install graphifyy
graphify extract ./src --update
```

## Konsekuensi

- Nol biaya sekarang, nol risiko cache invalidation sekarang.
- Kalau ternyata Cline mulai kehilangan arah di dalam `src/` lebih awal dari Irisan 6,
  ADR ini boleh dibuka lagi. Pemicunya: dua sesi berturut-turut Cline mengubah berkas
  yang salah karena tidak menemukan pemanggil sebuah fungsi.

## Alternatif yang sudah dipakai sebagai gantinya

Masalah "agen lupa" bukan diselesaikan graphify, tapi oleh:
- skill **`handoff`** — memadatkan sesi jadi dokumen serah-terima
- **`docs/CONTEXT.md`** — bahasa bersama, dibaca tiap sesi baru
- **`.clinerules/`** `alwaysApply` — aturan yang selalu ikut tanpa dibaca ulang
