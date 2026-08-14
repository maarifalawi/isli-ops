# Prototipe ISLI Ops

Satu berkas HTML. Klik dua kali `index.html`, terbuka di browser mana pun.
Tanpa instalasi, tanpa internet (kecuali untuk memuat Tailwind dari CDN).

---

## Cara menunjukkan ke Pak Indra

Urutannya penting. Jangan langsung ke fitur.

### 1. Buka halaman **Ringkasan** — diam sebentar

Biarkan dia membaca sendiri kotak merah:

> **Selisih Rp 22.500.000 ditemukan di file Excel**

Jangan dijelaskan dulu. Tunggu dia bertanya.

Ini menjawab kalimatnya sendiri: *"saya dari orang buta, kamu kasih mata satu,
saya kebuka dikit."* Kotak itu adalah mata satunya.

### 2. Tunjuk tabel GP per bulan

Baris Juni berwarna merah. Dua kolom bersebelahan: apa yang Excel laporkan,
apa yang sebenarnya. Selisihnya terlihat tanpa perlu dijelaskan.

### 3. Buka **Detail Job** — `ISLI-26.08-005`

Ini job punya dia sendiri. Tunjukkan kotak kuning di bawah:

| | Total biaya | GP |
|---|---|---|
| Versi Excel | 32.085.000 | 15,57% |
| Versi cetak | 34.535.000 | 9,12% |

Satu job, dua angka, selisih margin **6,45 poin**. Lalu bilang:
*"Hari ini nggak ada yang nangkep ini, Pak."*

### 4. Buka **Persetujuan**

Alur Staff → Manager → Owner, persis seperti yang dia sebut sendiri. Ditambah
satu kalimat yang mengutip permintaannya:

> Membuka kembali akan membatalkan seluruh persetujuan — prosesnya mulai dari awal.

### 5. Buka **Invoice** — bagian bawah

Kasus **01A / 01B** milik Bu Niken, ditolak otomatis. Ini bagian yang akan
membuat Bu Niken ikut mendukung — dan dukungannya penting.

### 6. Terakhir: buka di HP

Kirim berkasnya ke HP Pak Indra, atau buka di HP Anda dan serahkan.

Dia bilang approval dari laptop **dan** HP. Menunjukkan bahwa itu sudah
dipikirkan, tanpa perlu dibilang, lebih meyakinkan daripada janji.

---

## Yang HARUS dikatakan

Sebutkan di awal, jangan di akhir:

> "Pak, ini baru tampilan. Belum nyambung ke database, tombolnya belum
> berfungsi. Tujuannya supaya Bapak bisa lihat dulu bentuknya, sebelum
> memutuskan."

Kalau dia mengira ini sudah jadi lalu belakangan tahu belum, kepercayaannya
hilang — dan dia sudah pernah kecewa sekali dengan proyek sistem.

---

## Sumber angka

| Angka | Asal |
|---|---|
| 2.063.427.693 / 1.783.277.693 | `SUMMARY 2026` baris 37 |
| GP 257.650.000 vs 280.150.000 | `F37` vs `D37−E37` |
| Selisih 22.500.000 | `F19 = EXIM!Q39` bukan `Q50` |
| Job `26.08-005` dua versi | job sheet vs catatan tangan hal. 7 |
| Invoice Materee 23.848.600 | berkas invoice asli |

⚠️ Rincian 12 baris biaya pada Detail Job sebagian **ilustratif** — totalnya
tepat 32.085.000 sesuai job sheet, tapi pembagian per barisnya diperkirakan
dari job serupa. Angka pasti ada di berkas `SO BULAN AGUSTUS 2026.xlsx` yang
belum kita terima.

Kalau Pak Indra menanyakan satu baris secara spesifik, jawab jujur bahwa itu
perkiraan — dan pakai kesempatan itu untuk **meminta berkas `SO BULAN *.xlsx`**.

---

## Yang sengaja belum ada

Jangan tambahkan tanpa alasan. Prototipe yang terlalu lengkap membuat orang
mengira sistemnya hampir jadi.

```
✗ Login          ✗ Form input job      ✗ Master data
✗ Laporan pajak  ✗ Modul kas           ✗ PDF sungguhan
```
