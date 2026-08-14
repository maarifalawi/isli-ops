# Setup editor — Cursor IDE + ekstensi Cline

Konfigurasi Alawi: **IDE Cursor**, tapi yang mengoding adalah **ekstensi Cline**.
Cursor di sini cuma editor. Ini penting karena keduanya membaca berkas aturan yang
berbeda, dan salah satunya tidak bisa dikendalikan sama sekali.

## Siapa membaca apa

| Permukaan | Membaca | Status di repo ini |
|---|---|---|
| **Ekstensi Cline** (agen utama) | `.clinerules/*.md` + `AGENTS.md` | ✅ Lengkap, 7 berkas + 6 workflow |
| Cursor Chat / Composer | `.cursor/rules/*.mdc` | ⚠️ Cadangan ringkas saja |
| **Cursor Tab** (autocomplete) | **tidak ada** | ❌ **Tidak bisa dikendalikan** |
| Cursor Cmd+K (inline edit) | terbatas | ⚠️ Jangan diandalkan |

## Cursor Tab tidak bisa dipagari — ini fakta, bukan kelalaian

Dokumentasi Cursor menyatakan langsung di FAQ-nya:

> **Do rules impact Cursor Tab or other AI features?**
> *No. Rules do not impact Cursor Tab or other AI features.*

Alasannya teknis: Tab memakai model yang sangat cepat, dan menyuntikkan aturan akan
membuatnya lambat.

**Artinya untuk ISLI:** Tab akan dengan senang hati melengkapi `bg-blue-500`,
`toBeCloseTo`, `parseFloat` pada nilai rupiah, atau `role === "OWNER"` — dan **tidak
ada berkas aturan yang bisa mencegahnya.** Menulis `.cursor/rules` lebih banyak tidak
akan menolong. Itu jalan buntu.

## Jadi apa yang benar-benar menjaga

Bukan aturan. **Gerbang mekanis.** Inilah kenapa lapisan ini dipasang — semuanya
menangkap kerusakan Tab tanpa perlu Tab patuh:

| Lapis | Kapan menangkap | Menangkap apa |
|---|---|---|
| **TypeScript strict** | saat mengetik | tipe salah, `undefined` lolos |
| **Biome** | saat menyimpan | `any`, variabel tak terpakai, promise menggantung |
| **husky pre-commit** | sebelum commit | menjalankan Biome + typecheck. **Gerbang paling penting** — kerusakan Tab berhenti di sini, sebelum masuk git |
| **dependency-cruiser** | di CI | komponen mengimpor modul uang |
| **Golden test** | di CI | angka pajak meleset |
| **Playwright** | di CI | alur persetujuan rusak |

Urutan pertahanannya sengaja begini: aturan mengarahkan agen yang mau diarahkan,
gerbang mekanis menghentikan yang tidak bisa.

## Yang perlu dilakukan sekali

1. **Pastikan ekstensi Cline membaca `.clinerules/`.** Buka Cline → Settings → pastikan
   custom instructions / rules mengarah ke folder repo, bukan ke global.
2. **Jalankan `pnpm install`** sekali — ini memasang husky lewat script `prepare`.
   Tanpa itu, pre-commit hook tidak aktif dan pertahanan utama terhadap Tab hilang.
3. **Verifikasi hook-nya hidup:**
   ```bash
   ls -la .husky/pre-commit    # harus ada dan executable
   ```
4. **Pertimbangkan mematikan Tab** saat menggarap berkas sensitif — modul uang, pajak,
   costing, migrasi database. `Cmd/Ctrl+Shift+P` → `Cursor: Toggle Tab`.

## Kalau `.cursor/rules` dan `.clinerules` bertabrakan

`.clinerules/` menang. `.cursor/rules/00-pagar-keras.mdc` sengaja dibuat ringkas dan
hanya memuat larangan yang paling fatal, supaya kemungkinan bertabrakan kecil.

Jangan menyalin seluruh `.clinerules/` ke `.cursor/rules/`. Dua sumber kebenaran yang
harus disinkronkan manual akan menyimpang dalam hitungan minggu, dan yang menyimpang
itulah yang akan dibaca agen saat kamu tidak memperhatikan.
