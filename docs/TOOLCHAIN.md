# Toolchain & Pemasangan Wajib

Status: **rencana**, belum ada yang terpasang di repo ini (belum ada `package.json`).
Dokumen ini dieksekusi di Irisan 0 (lihat `docs/BUILD-PLAN.md`).

Aturan: **jangan pasang apa pun yang tidak ada di daftar ini tanpa ADR baru.** Setiap
baris di bawah punya alasan yang terikat ke masalah nyata ISLI, bukan karena populer.

---

## 1. Wajib — tanpa ini proyek tidak jalan

| Paket | Kenapa untuk ISLI |
|---|---|
| `next` (App Router) + `typescript` | ADR-0001. Web base, responsif laptop+HP (permintaan Pak Indra). |
| `drizzle-orm` + `drizzle-kit` | ADR-0003. Migrasi berversi — wajib karena skema uang tidak boleh berubah diam-diam. |
| `postgres` (driver) | Supabase Postgres. |
| `zod` | ADR-0003. Validasi batas masuk. `pph23Applicable` harus eksplisit, tidak pernah disimpulkan. |
| `vitest` | Golden test. `pnpm test:golden` adalah gerbang rilis. |
| `@playwright/test` | Alur persetujuan maker -> manajer -> Pak Indra tidak bisa diuji unit saja. |
| `next-safe-action` | Server action bertipe. Mencegah `assertCan()` terlewat di satu action. |
| `@tanstack/react-table` | Tabel job 12+ baris biaya. Sorting/filter tanpa nulis sendiri. |
| `react-hook-form` + `@hookform/resolvers` | Form job sheet 20+ field. Skema Zod dipakai ulang klien+server. |

## 2. Wajib — kualitas & keselamatan

| Paket | Kenapa untuk ISLI |
|---|---|
| `husky` + `lint-staged` | **Ada skill-nya: `misc/setup-pre-commit`.** Jalankan itu, jangan setup manual. |
| `@biomejs/biome` *atau* ESLint+Prettier | Pilih satu. Biome lebih cepat, satu binari. |
| `dependency-cruiser` | **Ada skill-nya: `in-progress/setup-ts-deep-modules`.** Memaksa modul dalam: logika uang hanya boleh diakses lewat entry point, tidak bisa di-import diam-diam dari komponen. Ini yang menegakkan larangan "jangan hitung uang di komponen" di `.clinerules/05-ui-conventions.md`. |
| GitHub Actions | `typecheck && lint && test && test:golden` di setiap PR. Tanpa ini `.clinerules` cuma imbauan. |
| `@sentry/nextjs` | 4 user, tidak ada tim ops. Kalau sistem error jam kerja, lu harus tahu sebelum Pak Indra menelepon. Jawaban Q61 yang belum ada prosedurnya. |

## 3. Spesifik masalah ISLI

| Paket | Kenapa |
|---|---|
| `@react-pdf/renderer` | ADR-0005 (Accepted). Render PDF invoice customer on-demand di server, langsung dari kolom beku (I-INV-1). Koreksi Irisan 10 Item 9: ADR-0005 mengikat atas baris lama yang menyarankan puppeteer — lihat docs/adr/0005. |
| `exceljs` atau `xlsx` | Impor `SO BULAN *.xlsx` (Q41) dan ekspor rekap untuk Bu Niken. Tanpa ini migrasi data historis manual. |
| `date-fns` + `date-fns-tz` | TOP 14/30 hari, ETD, jatuh tempo. Semua WIB. Jangan pakai `Date` mentah. |
| `web-push` | Notifikasi PWA. Menggantikan WhatsApp API — hemat ±Rp 500rb/bln (riset sudah dilakukan). |
| `supabase` CLI | Migrasi, seed, backup lokal. |

**TIDAK dipakai:** library uang apa pun (`dinero.js`, `big.js`). Kita sudah putuskan
`BIGINT` rupiah bulat + `applyRateBp()`. Menambah library uang = membuka pintu float.

## 4. Komponen UI — keputusan yang perlu diambil

`shadcn/ui` **diterima dengan syarat** (menyempurnakan ADR-0001, yang menyebutnya tanpa syarat). Alasannya jujur: membangun 30 komponen
aksesibel (dialog, dropdown, date picker, combobox vendor) dari nol akan memakan 2 minggu
dari 13 minggu yang dianggarkan, dan hasilnya akan lebih buruk soal keyboard/screen reader.

Syaratnya keras:

1. Hapus palet Tailwind bawaan. Petakan **hanya** token `docs/DESIGN-SYSTEM.md` ke
   `theme.extend.colors`, supaya `bg-blue-500` gagal saat kompilasi.
2. Radius diikat ke skala Apple (`5 / 8 / 11 / 18 / 9999`), bukan bawaan shadcn.
3. `box-shadow` dicabut dari semua komponen. Ganti hairline `1px #e0e0e0`.
4. Tinggi kontrol diturunkan ke 32-36px. Bawaan shadcn terlalu lega untuk tabel padat.

Kalau salah satu syarat itu tidak dijalankan, prototipe Apple yang sudah jadi akan
langsung rusak. Empat syarat itu dicatat di ADR-0009 (ADR-0008 sudah dipakai untuk graphify).

## 5. Yang sengaja DITOLAK

| Ditolak | Alasan |
|---|---|
| tRPC | `next-safe-action` sudah cukup untuk 1 klien. tRPC menambah lapisan tanpa pembeli. |
| Prisma | Sudah pilih Drizzle di ADR-0003. Jangan dua ORM. |
| NextAuth | 4 user, satu kantor. Supabase Auth sudah cukup. Q59 (Google SSO) belum dijawab. |
| Turborepo / monorepo | Satu aplikasi. Monorepo untuk 1 paket adalah biaya murni. |
| Storybook | Menarik, tapi 13 minggu solo. Prototipe HTML sudah jadi acuan visual. |
| **graphify** | Lihat `docs/adr/0008-graphify-ditunda.md`. |
