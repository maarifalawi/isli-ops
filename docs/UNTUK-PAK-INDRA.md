# Sistem Operasional ISLI — Ringkasan untuk Pak Indra

> Disiapkan Alawi · 13 Agustus 2026
> Dibaca sekitar 5 menit. Angka dan harga ada di halaman terakhir.

---

## Yang Bapak minta

> *"Saya itu punya mata satu pun nggak. Saya dari orang buta, kamu kasih mata satu,
> saya kebuka dikit, baru kita ngobrol penggunaannya kayak apa."*

Jadi yang saya siapkan bukan sistem lengkap. **Satu mata dulu.**

---

## Apa yang sudah saya temukan dari data Bapak

Saya pelajari berkas Excel, dua contoh invoice, dan catatan rapat. Ini yang keluar.

### 1. Ada selisih Rp 22,5 juta dalam empat bulan

Laporan rekap Bapak menulis total keuntungan kotor April–Juli **Rp 257.650.000**.
Hitungan yang benar: **Rp 280.150.000**.

Selisih **Rp 22.500.000**.

Penyebabnya satu rumus di sel `F19`. Rumus itu menarik angka dari baris yang salah
— mengambil `Q39` padahal seharusnya `Q50`. Bukan kesalahan orang. Ini jenis
kesalahan yang muncul sendiri ketika baris ditambah di tengah tabel Excel.

Kalau polanya sama sepanjang tahun, angkanya sekitar **Rp 67,5 juta setahun** yang
tercatat lebih rendah dari kenyataan.

> Yang mengkhawatirkan bukan besarnya. Yang mengkhawatirkan adalah **tidak ada
> yang tahu** — dan tidak ada cara untuk tahu, karena Excel tidak pernah memberi
> tahu kalau rumusnya menunjuk tempat yang keliru.

### 2. Satu job punya dua angka keuntungan yang berbeda

Job `ISLI-26.08-005` (TOTAL BANGUN PERSADA, Jakarta–Batam):

| | Versi Excel | Versi cetak |
|---|---:|---:|
| Penjualan | 38.000.000 | 38.000.000 |
| Total biaya | 32.085.000 | 34.535.000 |
| **Keuntungan** | **5.915.000** | **3.465.000** |
| Margin | 15,6% | 9,1% |

Bedanya satu baris: `CHARGE TRUCKING 2.500.000` ada di lembar cetak, tidak ada di
Excel.

Jadi untuk job yang sama, ada dua jawaban atas pertanyaan "untung berapa?" — dan
tidak ada cara tahu mana yang dipakai saat menagih.

### 3. Ada 16 nomor job yang kembar

Karena domestik, ekspor, dan impor memakai penomoran yang berjalan sendiri-sendiri,
`ISLI-26.06-007` bisa muncul dua kali dengan arti berbeda.

Selama ini tidak jadi masalah karena setiap orang tahu konteksnya. Tapi begitu
masuk sistem, ini harus ditangani — dan saya sudah menyiapkannya.

### 4. Masalah dobel bayar yang Bu Niken sebutkan itu nyata

Vendor menerbitkan `01A` (kena pajak) dan `01B` (reimburse). Staf salah input nomor
yang sama dua kali. Di sistem yang saya rancang, ini **tidak mungkin terjadi** —
bukan karena ada peringatan yang bisa diabaikan, tapi karena database menolak
menyimpannya sama sekali.

---

## Yang bisa Bapak lihat sekarang

Saya buatkan tampilan yang bisa dibuka di HP atau laptop. Isinya:

- **Ringkasan bulanan** — penjualan, biaya, keuntungan, per bulan
- **Daftar job** — bisa disaring per bulan dan per status
- **Rincian satu job** — 12 baris biaya, siapa vendornya, sudah dibayar belum
- **Alur persetujuan** — pembuat → manajer → Bapak
- **Layar invoice vendor** — dengan penolakan dobel bayar

Satu hal yang saya tampilkan sengaja: job `26.08-005` ditampilkan **dalam dua
versi berdampingan**, supaya kelihatan seperti apa masalahnya kalau dilihat di
layar, bukan di kertas.

> Ini masih gambar bergerak, belum sistem. Belum bisa menyimpan data. Tujuannya
> supaya Bapak bisa menunjuk dan bilang "yang ini salah" sebelum saya bangun.

---

## Cara kerja yang saya usulkan

Bapak pernah bercerita tentang proyek sistem di tempat kerja Bapak sebelumnya,
yang tidak selesai karena permintaan terus bertambah di tengah jalan. Jadi saya
balik urutannya.

**Tidak ada satu baris pun kode yang ditulis sebelum lima hal ini disepakati:**

1. Apa yang dibangun, tertulis, disetujui Bapak
2. Aturan pajak dan perhitungan, tertulis, disetujui Bu Niken
3. Struktur data, tertulis
4. Urutan pengerjaan — sepuluh bagian, masing-masing bisa dipakai sendiri
5. Daftar hal yang **tidak** dikerjakan di tahap ini, tertulis

Semua lima sudah selesai. Dokumennya ada, bisa Bapak baca kapan saja.

### Kenapa dibagi jadi sepuluh bagian kecil

Setiap bagian selesai dalam 1–2 minggu dan **langsung bisa dipakai**. Bapak tidak
menunggu enam bulan untuk melihat hasil. Kalau di tengah jalan Bapak merasa arahnya
keliru, yang hilang paling banyak dua minggu — bukan enam bulan.

Ini pelajaran langsung dari cerita Bapak itu.

---

## Yang saya kerjakan, yang tidak

**Dikerjakan di Fase 1:**

- Pencatatan job dengan tiga segmen (trucking, freight, delivery)
- Perhitungan biaya per job, keuntungan otomatis
- Penomoran job dan invoice otomatis, tidak bisa kembar
- Persetujuan bertingkat, dengan penguncian setelah final
- Invoice ke customer, cetak PDF dengan kop ISLI
- Invoice dari vendor, dengan penolakan dobel bayar
- Laporan operasional bulanan
- Empat akun dengan hak akses berbeda

**Tidak dikerjakan di Fase 1** — sengaja:

- Laporan keuangan dan laba rugi. Bapak sendiri bilang tidak perlu.
- Sambungan ke Accurate. Itu Fase 3, setelah data operasional rapi dulu.
- Kas dan petty cash. Fase 2.
- Aplikasi HP terpisah. Tidak perlu — tampilannya sudah menyesuaikan layar HP.

---

## Tampilannya

Bapak minta web. Saya pakai gaya yang tenang — putih, satu warna biru, tanpa warna
mencolok. Angka rata kanan, mudah dibandingkan.

Bisa dibuka dari laptop maupun HP. Persetujuan Bapak bisa dilakukan dari HP.

---

## Harga

| Tahap | Isi | Harga | Waktu |
|---|---|---:|---|
| **Fase 0** | Pendalaman + tampilan contoh | **Rp 8.500.000** | 2 minggu |
| **Fase 1** | Operasional inti | **Rp 65.000.000** | 10–12 minggu |
| **Fase 2** | Kas, pajak, impor | **Rp 42.000.000** | 6–8 minggu |
| **Fase 3** | Sambungan ke Accurate | **Rp 28.000.000** | 4–6 minggu |
| | **Total** | **Rp 143.500.000** | ±6 bulan |

Pembayaran Fase 1 dibagi tiga: 30% mulai, 40% tengah, 30% serah terima.

**Biaya berjalan:** sekitar **Rp 750.000 per bulan** (server dan database).
**Garansi perbaikan:** 60 hari setelah serah terima, gratis.
**Perawatan setelah itu:** Rp 3.500.000 per bulan, sifatnya pilihan.

### Soal balik modal

Satu kesalahan rumus yang saya temukan bernilai Rp 22,5 juta dalam empat bulan.
Kalau setahun sekitar Rp 67,5 juta, Fase 1 kembali modal dalam **sekitar 12 bulan**
— hanya dari satu jenis kesalahan yang tidak lagi bisa terjadi.

Itu belum menghitung waktu. Satu invoice tercatat butuh **349 menit** untuk dibuat.
Hampir enam jam untuk satu lembar.

**Yang saya sarankan: mulai dari Fase 0 saja.** Rp 8,5 juta, dua minggu. Kalau
hasilnya tidak meyakinkan, berhenti di situ. Bapak tidak perlu memutuskan
Rp 143 juta hari ini.

---

## Yang saya butuhkan dari Bapak

**Satu hal yang menghentikan pekerjaan:**

Berkas `SO BULAN *.xlsx` untuk April sampai Juli. Rekap bulanan yang saya terima
menunjuk ke berkas-berkas itu, tapi berkasnya sendiri belum ada di tangan saya.
Tanpa itu, biaya per job tidak bisa diperiksa dan data lama tidak bisa dipindahkan.

**Hal lain yang saya perlukan, tapi bisa jalan paralel:**

- Berkas `SO BULAN *.xlsx` untuk April sampai Juli — rekap yang ada menunjuk ke
  berkas-berkas itu tapi saya belum menerimanya
- Satu contoh POD dan satu contoh SO
- Keterangan Accurate yang Bapak langganan — versi apa, paket apa

Saya juga sudah siapkan daftar pertanyaan terpisah untuk Bu Niken soal pajak. Itu
yang paling menentukan benar-tidaknya invoice yang keluar nanti.

---

## Satu hal yang ingin saya tanyakan

Proyek sistem di tempat kerja Bapak sebelumnya berhenti di tengah jalan.

Saya ingin tahu apa yang terjadi — bukan untuk mencari siapa yang salah, dan
bukan urusan ISLI. Tapi kalau penyebabnya tidak diketahui, kemungkinan terulang
di sini tetap ada. Terutama kalau penyebabnya bukan soal teknis.

Itu pertanyaan pertama yang ingin saya ajukan saat kita bertemu lagi.
