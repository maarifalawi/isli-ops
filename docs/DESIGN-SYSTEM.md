# Sistem Desain ISLI Ops

Dasar: `apple-DESIGN.md` (analisis bahasa desain Apple.com).

Dokumen ini **bukan** salinan spec itu. Spec itu bahasa desain untuk halaman
jualan; ISLI Ops adalah aplikasi kerja padat data. Sebagian diambil utuh,
sebagian sengaja dilanggar. Setiap pelanggaran ditulis alasannya.

> **Aturan untuk Cline:** jangan pernah menulis warna Tailwind bawaan
> (`blue-600`, `emerald-500`, `slate-800`, dan sejenisnya). Hanya token di
> dokumen ini yang boleh dipakai. Kalau butuh warna yang belum ada di sini,
> **berhenti dan tanya** — jangan mengarang.

---

## Lapis 1 — Token Apple (diambil utuh)

### Warna

| Token | Hex | Pemakaian |
|---|---|---|
| `--canvas` | `#ffffff` | latar utama |
| `--parchment` | `#f5f5f7` | latar kedua, kepala tabel, footer |
| `--pearl` | `#fafafc` | isian tombol sekunder |
| `--ink` | `#1d1d1f` | semua teks utama |
| `--ink-80` | `#333333` | teks pendukung |
| `--ink-48` | `#7a7a7a` | label, keterangan, teks nonaktif |
| `--hairline` | `#e0e0e0` | garis batas 1px |
| `--divider` | `#f0f0f0` | pemisah halus |
| `--accent` | `#0066cc` | **satu-satunya** warna aksi |
| `--accent-focus` | `#0071e3` | cincin fokus keyboard |
| `--accent-dark` | `#2997ff` | tautan di atas permukaan gelap |
| `--black` | `#000000` | bilah navigasi atas |

**Tidak ada gradien. Tidak ada bayangan pada elemen UI.** Kedalaman datang
dari perubahan warna permukaan dan garis 1px, bukan dari `box-shadow`.

### Huruf

```css
font-family: "SF Pro Text", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
```

Gratis dan native di iPhone dan Mac. Di Android jatuh ke Roboto, di Windows ke
Segoe UI — keduanya aman, tidak perlu unduh berkas font.

Angka **wajib** `font-variant-numeric: tabular-nums`. Tanpa itu kolom rupiah
tidak akan lurus, dan tabel keuangan yang tidak lurus terlihat murahan.

### Sudut

`5px` · `8px` · `11px` · `18px` · `pill (9999px)`

Tombol utama memakai **pill** — itu tanda tangan Apple. Kartu memakai `11px`
atau `18px`. Baris tabel `0`.

---

## Lapis 2 — Skala kepadatan (menyimpang, disengaja)

### Yang dilanggar dan kenapa

| Token Apple | Nilai asli | Nilai kita | Alasan |
|---|---|---|---|
| `spacing.section` | 80px | **24px** | 80px berarti Pak Indra scroll 3 layar untuk 1 job |
| `hero-display` | 56px | dibuang | tidak ada halaman pemasaran di sini |
| `lead` | 28px | dibuang | idem |
| `body` | 17px | **13px** | tabel 7 kolom tidak muat di 17px |
| Satu tile per layar | — | dibuang | ini alat kerja, bukan galeri |

Spec-nya sendiri mengakui: *"Density is unusually low even by contemporary
SaaS standards."* Itu tepat untuk memamerkan iPhone. Untuk memamerkan 24 baris
biaya, itu bencana.

### Skala ukuran huruf

| Nama | Ukuran | Berat | Pemakaian |
|---|---|---|---|
| `title` | 20px | 600 | judul halaman |
| `section` | 15px | 600 | judul kartu |
| `body` | 13px | 400 | teks umum, isi tabel |
| `label` | 12px | 400 | label kolom, keterangan |
| `micro` | 11px | 500 | badge, teks legal |
| `figure` | 22px | 600 | angka besar di kartu ringkasan |

### Skala jarak

`4` · `8` · `12` · `16` · `24` · `32` px. Berhenti di 32.

Padding sel tabel: `8px 12px`. Padding kartu: `16px`.

---

## Lapis 3 — Warna semantik (menyimpang, wajib)

### Konfliknya

Spec Apple menyatakan tegas:

> *"Single blue accent carries every interactive element. **No second brand
> color exists.**"*

Aturan itu **tidak bisa dipakai di sini**. Sistem keuangan harus bisa
membedakan sudah bayar dari belum bayar, margin sehat dari margin bahaya,
angka benar dari angka salah. Warna di sini memikul makna, bukan hiasan.

### Jalan keluarnya

Kita **tidak mengarang warna**. Apple punya palet semantik resmi di Human
Interface Guidelines, dan kita pakai varian **kontras tinggi untuk mode
terang** — varian yang gelap dan teredam, bukan varian cerah yang dipakai di
ikon iOS.

| Makna | Hex | Nama Apple |
|---|---|---|
| Bahaya / selisih / ditolak | `#d70015` | Red (high contrast, light) |
| Peringatan / margin tipis | `#c93400` | Orange (high contrast, light) |
| Aman / lunas / disetujui | `#248a3d` | Green (high contrast, light) |
| Netral / nonaktif | `#6c6c70` | Gray (high contrast, light) |

Bandingkan dengan varian cerah yang **tidak** kita pakai:

```
DIPAKAI (teredam)        DITOLAK (menyala)
#d70015  merah tua       #ff3b30  merah neon
#248a3d  hijau tua       #34c759  hijau neon
#c93400  jingga tua      #ff9500  jingga neon
```

Semuanya lolos kontras 4.5:1 di atas putih, jadi angka rupiah merah tetap
terbaca di layar HP di bawah lampu kantor.

### Aturan pemakaian — ini bagian terpenting

**Warna semantik hanya boleh muncul pada teks, angka, garis tepi, dan titik
kecil. Tidak boleh jadi latar blok besar.**

Inilah yang menjaga rasa Apple-nya. Kotak peringatan bukan blok merah muda —
melainkan kartu putih bergaris `1px --hairline`, dengan angkanya saja yang
merah.

```
✗ SALAH                        ✓ BENAR
┌──────────────────┐        ┌──────────────────┐
│ latar merah muda │        │ latar putih        │
│ teks merah tebal │        │ Selisih  22.500.000│  ← angka merah
└──────────────────┘        └──────────────────┘  garis abu 1px
```

Satu-satunya pengecualian: isian sangat tipis `8%` alfa untuk menyorot **baris
tabel**, karena teks saja tidak cukup untuk menandai satu baris di antara 20.

### Badge status

Bukan kapsul warna-warni. Titik 6px berwarna + teks `--ink`:

```
● Lunas          titik #248a3d, teks #1d1d1f
● Menunggu       titik #c93400, teks #1d1d1f
● Ditolak        titik #d70015, teks #1d1d1f
● Draf           titik #6c6c70, teks #7a7a7a
```

Tenang dari jauh, jelas dari dekat. Dan tetap terbaca oleh orang buta warna,
karena teksnya tetap ada.

---

## Komponen yang tidak ada di spec Apple

Gua periksa seluruh 562 baris `apple-DESIGN.md`. Hasilnya:

```
badge     0 kali      modal       0 kali
status    0           toast       0
checkbox  0           pagination  0
sidebar   0           tooltip     0
data-grid 0           motion      0
table     5 (sekilas, bukan komponen)
```

Spec-nya sendiri punya bagian `## Known Gaps`. Jadi untuk semua di bawah ini
kita **membangun sendiri di atas token Apple** — bukan mengikuti Apple, karena
Apple tidak menyediakannya.

### Tabel

```
kepala   : latar --parchment, teks --ink-48, 12px, huruf kapital, tracking 0.04em
baris    : latar --canvas, garis bawah 1px --divider
hover    : latar --parchment
angka    : rata kanan, tabular-nums
teks     : rata kiri
tinggi   : 36px
```

Tanpa garis vertikal. Tanpa garis zebra. Pemisahnya hanya garis horizontal
tipis — ini yang paling dekat dengan disiplin Apple untuk data padat.

### Kartu

Latar `--canvas`, garis `1px --hairline`, sudut `11px`, padding `16px`. Tanpa
bayangan, selamanya.

### Tombol

| Jenis | Isian | Teks | Sudut |
|---|---|---|---|
| Utama | `--accent` | putih | pill |
| Sekunder | transparan | `--accent` | pill, garis 1px `--accent` |
| Netral | `--pearl` | `--ink-80` | `11px`, garis 1px `--divider` |
| Merusak | transparan | `#d70015` | pill, garis 1px `#d70015` |

Tinggi 32px untuk aksi tabel, 40px untuk aksi utama. Saat ditekan:
`transform: scale(0.96)` — mikro-interaksi khas Apple, satu-satunya animasi
yang dipakai.

### Formulir

Garis 1px `--hairline`, sudut `8px`, tinggi 36px, padding `8px 12px`. Saat
aktif: garis `--accent` + cincin `2px --accent-focus`. Kolom uang rata kanan,
tabular-nums, dengan pemisah ribuan otomatis.

---

## Sentuh dan layar kecil

Pak Indra menyetujui dari HP. Spec Apple menetapkan sasaran sentuh 44px —
ini **diambil utuh**, tidak boleh dikurangi meski tampilannya jadi lebih longgar.

| Lebar | Perlakuan |
|---|---|
| `< 640px` | tabel berubah jadi kartu bertumpuk; navigasi jadi bilah bawah |
| `640–1024px` | tabel bergulir mendatar, kolom kunci dipatok |
| `> 1024px` | tabel penuh |

Di HP, tombol **Setujui** dan **Kembalikan** dipatok di bawah layar, saling
berdampingan, tinggi 44px. Jangan sampai Pak Indra harus menggulir untuk
menyetujui.

---

## Mode gelap

**Belum sekarang.** Token sudah disiapkan (`--surface-tile-1: #272729`,
`--accent-dark: #2997ff`), tapi jangan dibangun sampai Fase 1 selesai.
Menambah mode gelap berarti melipatduakan permukaan uji tanpa ada yang minta.

---

## Yang dilarang keras

```
✗ warna Tailwind bawaan          ✗ gradien apa pun
✗ box-shadow pada elemen UI      ✗ emoji sebagai ikon
✗ latar blok berwarna menyala    ✗ lebih dari satu warna aksi
✗ animasi selain scale(0.96)     ✗ huruf selain SF Pro / system-ui
✗ angka tanpa tabular-nums       ✗ sasaran sentuh di bawah 44px
```
