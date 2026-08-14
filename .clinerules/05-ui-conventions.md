---
description: Aturan tampilan ISLI Ops. Baca sebelum menulis komponen, halaman, atau CSS apa pun.
---

# Aturan Tampilan

Sumber kebenaran: **`docs/DESIGN-SYSTEM.md`**. Baca dulu. Berkas ini hanya
ringkasan yang bisa ditegakkan.

Dasar visualnya adalah bahasa desain Apple, tapi **hanya tokennya** — bukan
kepadatannya. Apple mendesain untuk memamerkan produk; kita mendesain untuk
memamerkan angka.

---

## Larangan keras

Melanggar salah satu dari ini = perubahanmu ditolak.

```
✗ Warna Tailwind bawaan: blue-600, emerald-500, slate-800, red-50, dst.
✗ Warna heksa yang tidak ada di docs/DESIGN-SYSTEM.md
✗ Gradien apa pun
✗ box-shadow pada elemen UI
✗ Latar blok berwarna menyala (bg merah muda, bg hijau muda, dst.)
✗ Lebih dari satu warna aksi
✗ Emoji sebagai ikon
✗ Animasi selain transform: scale(.96) saat ditekan
✗ Angka tanpa font-variant-numeric: tabular-nums
✗ Sasaran sentuh di bawah 44px pada layar < 640px
```

Kalau kamu butuh warna yang belum ada di dokumen desain, **berhenti dan
tanya**. Jangan mengarang. Jangan "kira-kira mirip".

---

## Selalu pakai variabel CSS

```css
/* BENAR */
color: var(--ink);
border: 1px solid var(--hairline);

/* SALAH */
color: #1d1d1f;          /* jangan tulis heksa langsung */
class="text-slate-900"   /* jangan pakai palet Tailwind */
```

Semua token didefinisikan sekali di `:root`. Kalau memakai Tailwind, petakan
token ke `theme.extend.colors` dan **matikan palet bawaan** supaya
`bg-blue-500` gagal saat kompilasi, bukan lolos diam-diam.

---

## Warna semantik — aturan yang paling sering dilanggar

Empat warna ini memikul makna, bukan hiasan:

```
--red    #d70015   bahaya, selisih, ditolak
--orange #c93400   peringatan, margin tipis
--green  #248a3d   aman, lunas, disetujui
--gray   #6c6c70   netral, nonaktif
```

Semuanya varian **kontras tinggi** dari palet resmi Apple. Jangan pernah
menggantinya dengan varian cerah (`#ff3b30`, `#34c759`, `#ff9500`) — itu warna
ikon iOS, dan di layar penuh angka hasilnya norak.

**Warna semantik hanya boleh muncul pada teks, angka, garis tepi, dan titik
6px. Tidak pernah sebagai latar blok.**

Satu pengecualian: sorot baris tabel boleh memakai alfa 5–8%.

```html
<!-- BENAR -->
<div class="card">
  <span>Selisih</span>
  <span class="num red">22.500.000</span>
</div>

<!-- SALAH -->
<div style="background:#fee2e2;color:#991b1b">Selisih 22.500.000</div>
```

### Badge = titik + teks, bukan kapsul berwarna

```html
<span class="bg-t"><span class="dot" style="background:var(--green)"></span>Lunas</span>
```

Teksnya harus tetap ada. Jangan pernah menyampaikan status **hanya** lewat
warna — sebagian orang tidak bisa membedakannya.

---

## Uang

```
✓ rata kanan, selalu
✓ font-variant-numeric: tabular-nums, selalu
✓ pemisah ribuan titik  →  toLocaleString('id-ID')
✓ tanpa simbol "Rp" di dalam sel tabel; taruh di kepala kolom
✓ nol ditulis 0, bukan —
✓ nilai kosong ditulis — dengan warna var(--ink-48)
✗ jangan pernah membulatkan untuk tampilan; format nilai penuh
```

Nilai negatif memakai kurung dan `var(--red)`: `(1.000.000)`.

Angka datang dari server sebagai `BIGINT` rupiah. **Jangan pernah** melakukan
aritmetika uang di komponen — hanya memformat. Kalau kamu merasa perlu
menghitung di sisi tampilan, itu tanda ada perhitungan yang hilang di server.

---

## Kepadatan

Di sinilah kita sengaja meninggalkan Apple.

```
tinggi baris tabel   36px
padding sel          8px 12px
padding kartu        16px
jarak antar bagian   24px   (Apple: 80px — tidak dipakai)
ukuran teks umum     13px   (Apple: 17px — tidak dipakai)
```

Patokannya: **satu job dengan 12 baris biaya harus muat dalam satu layar
laptop tanpa menggulir.** Kalau tidak muat, kepadatannya salah.

---

## Tabel

```
kepala   latar var(--parchment), 11px, kapital, var(--ink-48)
baris    garis bawah 1px var(--divider)
hover    latar var(--parchment)
```

Tanpa garis vertikal. Tanpa zebra. Tanpa bayangan.

Di bawah 640px, tabel **berubah menjadi kartu bertumpuk** — jangan biarkan
pengguna menggulir mendatar di HP untuk membaca angka penting.

---

## Layar kecil

Pak Indra menyetujui dari HP. Ini bukan tambahan, ini persyaratan.

```
< 640px    tabel → kartu; tombol aksi dipatok di bawah layar; tinggi 44px
640–1024   tabel bergulir, kolom pertama dipatok
> 1024px   tabel penuh
```

Uji setiap layar di lebar **375px** sebelum menyatakan selesai. Kalau ada
yang terpotong atau tombol harus dicari dengan menggulir, belum selesai.

---

## Bahasa

Seluruh antarmuka **bahasa Indonesia**. Penggunanya empat orang di Bekasi;
tidak ada yang butuh bahasa Inggris.

```
✓ Simpan, Ajukan, Setujui, Kembalikan, Batalkan
✗ Save, Submit, Approve, Reject, Cancel
```

Pengecualian — istilah dagang yang memang dipakai sehari-hari di kantor,
jangan diterjemahkan:

```
job · invoice · vendor · freight · trucking · dooring · vessel
THC · LSS · THD · POD · FCL · LCL · ETD · TOP · GP · NETT
```

Menerjemahkan istilah ini justru membuat Bu Niken dan Fairol bingung. Ikuti
kosakata di `docs/CONTEXT.md`.

Pesan galat harus menyebut **apa yang harus dilakukan**, bukan apa yang rusak:

```
✓ "Nomor invoice ini sudah pernah dipakai untuk vendor SPIL. Periksa kembali."
✗ "Error: unique constraint violation on uq_vendor_invoice"
```

---

## Sebelum bilang selesai

```
[ ] Tidak ada satu pun warna Tailwind bawaan di diff
[ ] Tidak ada heksa di luar docs/DESIGN-SYSTEM.md
[ ] Semua angka tabular-nums dan rata kanan
[ ] Diuji pada lebar 375px
[ ] Sasaran sentuh 44px di layar kecil
[ ] Semua label bahasa Indonesia, istilah dagang dipertahankan
[ ] Status disampaikan lewat teks, bukan hanya warna
```
