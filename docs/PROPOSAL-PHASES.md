> ⚠️ **DITAHAN 13 Agu 2026 — JANGAN DIKIRIM DULU.**
>
> Klien memutuskan fokus ke pembangunan sistem lebih dahulu; penawaran menyusul.
> Angka di dokumen ini juga **sudah tidak lengkap**: kebutuhan F12–F14 (filter
> rentang, halaman peringkat, field wajib buying) masuk setelah dokumen ini
> ditulis, dan belum dihitung di dalamnya. Perkiraan tambahan: 2–3 minggu.
>
> Hitung ulang sebelum dokumen ini dipakai.

# Proposal & Harga

**Untuk:** PT. Integra Sinergi Logitama Indonesia
**Dari:** Alawi
**Tanggal:** 13 Agustus 2026
**Berlaku:** 30 hari

---

## Ringkasan satu halaman untuk Pak Indra

| | |
|---|---|
| **Masalah** | Biaya per job tidak ter-capture. Semua manual. |
| **Bukti** | Ditemukan selisih **Rp 22.500.000** dari satu rumus salah di file summary |
| **Yang dibangun** | Sistem operasional job costing berbasis web, bisa dibuka dari HP |
| **Yang TIDAK dibangun** | Laporan keuangan, P&L, neraca — sesuai permintaan |
| **Total 3 fase** | **Rp 143.500.000** |
| **Bisa mulai dari** | **Rp 8.500.000** (Fase 0) tanpa komitmen fase berikutnya |

---

## Kenapa angkanya masuk akal

Satu rumus salah di sel `F19` menyembunyikan **Rp 22.500.000** dalam 4 bulan.

```
Dalam 4 bulan   Rp  22.500.000  tidak terlihat
Setahun         Rp  67.500.000  (proyeksi)
```

Itu **satu sel**, di **satu file**, yang **kebetulan ketemu**. Belum termasuk:

- 16 nomor job bertabrakan → rekap bisa tertukar
- Job `26.08-005` punya 2 versi biaya, selisih Rp 2.500.000
- PPN 1,1% ikut terhitung sebagai margin → GP terlihat lebih besar dari nyatanya
- Dropping kas Rp 200 juta vs pemakaian Rp 210,1 juta — lebih Rp 10,1 juta

Fase 1 impas dalam waktu kurang dari setahun **hanya dari mencegah kesalahan
hitung**, belum menghitung waktu yang hemat.

---

## Fase 0 — Pendalaman & Prototipe

**Rp 8.500.000 — 2 minggu**

| Keluaran | |
|---|---|
| Prototipe bisa diklik | Pak Indra lihat bentuk sistemnya sebelum bayar besar |
| 20 pertanyaan kunci terjawab | aturan PPh 23, pembulatan (✅ sudah), pemindahan biaya (✅ sudah) |
| Berkas `SO BULAN *.xlsx` dikumpulkan | sumber biaya per job yang asli |
| Cakupan Fase 1 dikunci tertulis | **ini penangkal scope creep** |
| Laporan temuan data | seperti Rp 22,5 juta di atas |

> **Kenapa fase ini ada.** Proyek sebelumnya gagal karena cakupan terus
> bergerak. Fase 0 memaksa cakupan Fase 1 ditulis dan ditandatangani sebelum
> satu baris kode ditulis.
>
> Kalau setelah Fase 0 Pak Indra memutuskan tidak lanjut, **prototipe dan
> seluruh dokumen tetap jadi milik ISLI.** Tidak ada yang hangus.

---

## Fase 1 — Operasional Inti

**Rp 65.000.000 — 10–12 minggu**

### Yang jadi

| Modul | Isi |
|---|---|
| **Master data** | Customer, vendor, charge code, kurs, identitas & NPWP perusahaan |
| **Job / SO** | Form sesuai job sheet yang dipakai sekarang, 3 varian: DOM FCL, LCL, SEA EXIM |
| **Biaya per baris** | Selling & buying per baris, pencadangan vs actual, penanda at-cost |
| **Penomoran otomatis** | `ISLI-26.08-005`, 3 counter paralel DOM/EXP/IMP, anti-tabrakan |
| **GP & NETT otomatis** | Satu rumus, satu tempat. Tidak bisa beda antar halaman. |
| **Approval 3 tingkat** | Staff → Manager → Pak Indra. Buka kunci = approval ulang dari awal. |
| **Invoice customer** | PDF dengan kop ISLI, penomoran otomatis, PPN 1,1%, PPh 23, reimburse |
| **Invoice vendor** | **Anti dobel bayar** — nomor invoice vendor dikunci, kasus 01A/01B tidak terulang |
| **Piutang** | Tanggal cetak, kirim, jatuh tempo (30 hari DOM / 14 hari EXIM), status bayar |
| **Laporan operasional** | Summary per bulan, per segmen, per customer, per sales. Ekspor Excel. |
| **Hak akses** | 3 peran, 4 user |
| **Jejak audit** | Siapa ubah apa, kapan. Tidak bisa dihapus. |
| **Responsif** | Laptop + HP. Approval nyaman satu tangan. |
| **Notifikasi** | Push ke HP, gratis, tanpa WhatsApp API |

### Yang TIDAK termasuk

```
✗ Laporan keuangan / P&L / neraca      (diminta tidak perlu)
✗ Integrasi Accurate                    (Fase 3)
✗ Modul kas & dropping                  (Fase 2)
✗ Job impor                             (Fase 2 — belum ada sampel)
✗ Migrasi data lama                     (Fase 2 — butuh berkas SO BULAN)
✗ Aplikasi Android/iOS terpisah         (PWA sudah cukup)
```

### Termin

| Tahap | % | Nilai | Pemicu |
|---|---:|---:|---|
| Uang muka | 30% | Rp 19.500.000 | kontrak diteken |
| Modul job & biaya selesai | 40% | Rp 26.000.000 | bisa input job & lihat GP |
| Serah terima | 30% | Rp 19.500.000 | UAT lulus, pelatihan selesai |

---

## Fase 2 — Kas, Pajak & Impor

**Rp 42.000.000 — 6–8 minggu**

| Modul | Kenapa |
|---|---|
| Kas & dropping | Sheet tersembunyi menunjukkan pemakaian lebih Rp 10,1 juta — tidak terpantau |
| Rekap PPh 23 | Bu Niken minta: berapa pajak yang sudah dipotong, per vendor, per bulan |
| Rekap pembayaran vendor | Sudah bayar vendor A berapa bulan ini — untuk pajak |
| Job impor | Setelah ada sampel invoice `INVIMP` |
| Pemindahan biaya antar job | Kasus "dipecah ke 07-014" — dengan jejak, bukan diam-diam |
| Lampiran dokumen | POD, BL, invoice vendor, bukti bayar |

---

## Fase 3 — Sambung ke Accurate

**Rp 28.000.000 — 4–6 minggu**

Accurate Online punya API resmi. Secara teknis layak.

| Arah | Objek |
|---|---|
| ISLI → Accurate | Sales Invoice, Purchase Invoice |
| ISLI → Accurate | Pembayaran & penerimaan |
| Sinkron | Master customer & vendor |

> Harga ini **perkiraan**. Dipastikan setelah tahu paket langganan Accurate
> ISLI dan endpoint apa yang terbuka. Bisa naik atau turun.

---

## Ringkasan biaya

| Fase | Nilai | Durasi |
|---|---:|---|
| Fase 0 — Pendalaman & prototipe | Rp 8.500.000 | 2 minggu |
| Fase 1 — Operasional inti | Rp 65.000.000 | 10–12 minggu |
| Fase 2 — Kas, pajak, impor | Rp 42.000.000 | 6–8 minggu |
| Fase 3 — Accurate | Rp 28.000.000 | 4–6 minggu |
| **Total** | **Rp 143.500.000** | **± 6 bulan** |

Setiap fase berdiri sendiri. Boleh berhenti di mana saja.

---

## Biaya berjalan (dibayar ISLI langsung ke penyedia)

| Item | Perkiraan |
|---|---:|
| Hosting aplikasi | Rp 320.000/bln |
| Database + penyimpanan | Rp 400.000/bln |
| Domain | Rp 200.000/thn |
| **Total** | **± Rp 750.000/bln** |

**Akun dibuat atas nama ISLI sejak hari pertama**, Alawi diundang sebagai
kolaborator. Saat serah terima tinggal cabut akses — tidak ada pemindahan akun
yang berisiko.

---

## Perawatan (opsional)

**Rp 3.500.000/bulan**

Perbaikan bug, pantau sistem, pastikan cadangan jalan, 4 jam penyesuaian kecil
per bulan. Bisa dihentikan kapan saja dengan pemberitahuan 30 hari.

**Garansi bug: 60 hari** setelah serah terima, gratis. Berlaku untuk perilaku
yang menyimpang dari cakupan yang disepakati — bukan untuk permintaan fitur
baru.

---

## Yang dibutuhkan dari ISLI

Tanpa ini jadwal mundur, dan itu di luar kendali pengembang:

| # | Kebutuhan | Kapan |
|---|---|---|
| 1 | Jawaban 20 pertanyaan kunci | Fase 0 |
| 2 | Berkas `SO BULAN *.xlsx` (Apr–Agu) | Fase 0 |
| 3 | ~~Kejelasan soal gsoft~~ | ✅ **selesai 13 Agu 2026** |
| 4 | NPWP ISLI & daftar customer/vendor resmi | awal Fase 1 |
| 5 | 1 PIC yang bisa dihubungi tiap minggu | sepanjang proyek |
| 6 | Waktu Bu Niken untuk UAT, ± 4 jam | akhir Fase 1 |

> ✅ **Nomor 3 sudah tertutup.** gsoft adalah sistem di perusahaan Pak Indra
> sebelumnya dan tidak ada kaitan dengan ISLI. Proyek ini pembuatan baru, dan
> harga Fase 1 di atas **tidak perlu dihitung ulang**.

---

## Cara kerja — supaya tidak mengulang kegagalan lalu

Pak Indra menyebut proyek sebelumnya gagal karena cakupan terus bertambah.
Tiga hal yang berbeda kali ini:

**1. Cakupan dikunci tertulis di akhir Fase 0.** Perubahan setelah itu masuk
daftar terpisah, dihargai terpisah, dikerjakan setelah Fase 1 selesai. Bukan
ditolak — ditunda.

**2. Ada yang bisa dilihat setiap 2 minggu.** Bukan menghilang 3 bulan lalu
muncul membawa sesuatu yang ternyata salah.

**3. Angka diuji terhadap data ISLI sendiri.** Sistem harus menghasilkan
Rp 280.150.000, bukan meniru Rp 257.650.000 yang salah di Excel. Kalau tidak
cocok, itu bug — bukan diakali.
