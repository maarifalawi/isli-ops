# ADR-0009 — shadcn/ui dipakai bersyarat

**Status:** Accepted
**Tanggal:** 13 Agustus 2026
**Menggantikan sebagian:** ADR-0001 (yang menyebut "Tailwind + shadcn/ui" tanpa syarat)

## Konteks

ADR-0001 sudah menerima Tailwind + shadcn/ui sebagai lapisan antarmuka. Setelah
itu, `docs/DESIGN-SYSTEM.md` disusun dari `apple-DESIGN.md` atas permintaan klien
("pake apple aja untuk warnanya juga. jangan ada neon neon").

Dua keputusan itu bertabrakan. shadcn/ui membawa bawaan yang bertentangan langsung
dengan sistem desain yang sudah disepakati:

| Bawaan shadcn | Aturan design system |
|---|---|
| Palet Tailwind penuh | Hanya token dari `DESIGN-SYSTEM.md` |
| `shadow-sm` pada Card, Dialog, Popover | Tidak ada bayangan pada elemen UI |
| Radius `--radius` bebas | Hanya `0 / 5 / 8 / 11 / 18 / 9999` |
| Tinggi kontrol 40px (`h-10`) | 32–36px, demi kepadatan |
| Warna semantik sebagai latar (`destructive`) | Semantik hanya untuk teks, angka, garis |

## Keputusan

shadcn/ui **dipakai**, tapi sebagai sumber salinan komponen yang langsung diedit,
bukan sebagai pustaka yang diikuti apa adanya. Empat syarat berikut wajib, dan
tidak boleh dilonggarkan tanpa ADR baru.

**Syarat 1 — palet bawaan Tailwind dimatikan.**
Sudah dikerjakan di `tailwind.config.ts`: `theme.colors` mengganti, bukan
menambah. Akibatnya `bg-blue-500` gagal saat build. Ini bukan sekadar kebersihan
— ini satu-satunya cara memagari Cursor Tab, yang tidak bisa dikendalikan aturan
sama sekali (lihat `docs/SETUP-EDITOR.md`).

**Syarat 2 — radius diikat.**
`borderRadius` di `tailwind.config.ts` hanya memuat enam nilai yang diizinkan.
Jangan pakai `--radius` milik shadcn.

**Syarat 3 — semua `box-shadow` dibuang saat menyalin komponen.**
Ganti dengan hairline `1px solid var(--hairline)`. `boxShadow` di konfigurasi
sudah dipangkas jadi hanya `none`, jadi `shadow-sm` gagal saat build.

**Syarat 4 — tinggi kontrol diturunkan ke 32–36px.**
Patokan kepadatan yang disepakati: satu job dengan 12 baris biaya harus muat
dalam satu layar laptop tanpa menggulir. Dengan `h-10` bawaan shadcn, patokan
itu meleset sekitar dua baris.

## Konsekuensi

**Baik.** Tetap dapat perilaku aksesibilitas Radix — fokus terperangkap di dialog,
navigasi keyboard, atribut ARIA — yang mahal dibuat sendiri dan mudah salah.

**Buruk.** Tidak bisa menyalin-tempel dari dokumentasi shadcn tanpa mengedit.
Tiap komponen baru butuh empat suntingan di atas. Ini disengaja: gesekan itulah
yang mencegah sistem desain runtuh diam-diam.

**Risiko.** Kalau ada yang menjalankan `npx shadcn add` lalu langsung commit tanpa
mengedit, build akan gagal — bukan diam-diam lolos. Itu hasil yang diinginkan.

## Alternatif yang ditolak

**Radix murni tanpa shadcn.** Lebih bersih, tapi berarti menulis sendiri seluruh
lapisan gaya untuk tiap komponen. Untuk tim satu orang, itu waktu yang lebih baik
dipakai untuk logika pajak.

**Pustaka komponen jadi (MUI, Mantine, Ant).** Semuanya membawa bahasa visual
sendiri yang harus dilawan, bukan sekadar disesuaikan. Melawan tema pustaka jauh
lebih mahal daripada mengedit salinan komponen.
