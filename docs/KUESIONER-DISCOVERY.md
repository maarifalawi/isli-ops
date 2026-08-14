# Kuesioner Discovery — Sistem Operasional ISLI

> Disiapkan oleh Alawi · 13 Agustus 2026
> Sumber: transkrip rapat, catatan tulisan tangan, 2 berkas Excel, 2 contoh invoice, kop surat.

**Cara pakai dokumen ini.** Pertanyaan sudah dikelompokkan **per orang** dan **per sesi**,
bukan per nomor. Tidak perlu diisi berurutan dan tidak perlu selesai sekali duduk.

Tiga tingkat kepentingan:

| Tanda | Artinya |
|---|---|
| 🔴 | Pembangunan berhenti kalau ini belum dijawab |
| 🟡 | Bisa jalan paralel, tapi jangan sampai lewat bulan ini |
| 🟢 | Boleh menyusul |

Kalau jawabannya **"belum tahu"** atau **"belum pernah dibahas"** — tulis begitu saja.
Itu jawaban yang berguna. Yang berbahaya justru tebakan yang kelihatan meyakinkan.

---

# SESI 1 — Bu Niken

## Bagian A — Pajak

Bagian ini yang paling menentukan. Kalau salah, invoice yang keluar salah, dan yang
menanggung ISLI.

**A1** 🔴 Invoice Diametral dipotong **PPh 23 sebesar 2%**, tapi invoice Materee tidak
dipotong sama sekali. Apa yang membedakan keduanya?

> Yang kami butuhkan bukan contohnya, tapi **aturannya** — supaya sistem tahu kapan
> harus memotong dan kapan tidak. Apakah tergantung customer punya NPWP? Tergantung
> jenis jasanya? Atau customer yang menentukan?

```
Jawaban:


```

**A2** 🔴 Di invoice Diametral, grand total tertulis **Rp 131.429.434**. Hitungan kami
berhenti di **Rp 131.429.433**. Selisih satu rupiah.

> Aturan pembulatan yang benar apa — dibulatkan ke atas, ke bawah, atau ke terdekat?
> Dan dibulatkan di langkah mana: tiap baris, atau hanya di total akhir?
>
> Selisih satu rupiah terdengar sepele, tapi kalau aturannya salah, semua invoice ke
> depan akan meleset dan tidak cocok dengan pembukuan.

```
Jawaban:


```

**A3** 🔴 **PPN 1,1%** — apakah selalu segitu untuk semua jasa? Ada jasa yang kena 11%
penuh, atau yang tidak kena sama sekali?

```
Jawaban:


```

**A4** 🔴 Di job sheet ada dua istilah: **GP** dan **NETT**.

> Dari rumus di Excel, kami baca begini:
> • `GP = penjualan sebelum pajak − biaya`
> • `NETT = penjualan sesudah pajak − biaya`
>
> Artinya **NETT memasukkan PPN ke dalam margin**. Padahal PPN itu uang negara yang
> cuma numpang lewat, bukan keuntungan ISLI.
>
> Pertanyaannya: apakah itu memang disengaja sebagai cara pandang internal, atau
> selama ini keliru? Kalau disengaja, laporan ke Pak Indra sebaiknya pakai yang mana?

```
Jawaban:


```

**A5** 🟡 PPh 23 yang **ISLI potong ke vendor** — bagaimana mekanismenya sekarang?
Siapa yang membuat bukti potongnya, dan kapan?

```
Jawaban:


```

**A6** 🟡 Ibu pernah menyebut butuh rekap **"sudah potong PPh 23 berapa ke customer"**
dan **"sebulan sudah bayar vendor A berapa"**. Rekap itu untuk keperluan apa — lapor
SPT bulanan, rekonsiliasi, atau lainnya? Dibutuhkan setiap tanggal berapa?

```
Jawaban:


```

## Bagian B — Jatuh tempo & penagihan

**B1** 🔴 Jatuh tempo dihitung **dari tanggal apa**? Di Excel kami menemukan tiga rumus
yang berbeda: ada yang `+1 hari`, ada `+2 hari`, ada `+3 hari` dari tanggal lain lagi.

> Kandidatnya: tanggal invoice, tanggal POD diterima di Jakarta, atau tanggal kirim
> invoice ke customer. Yang mana yang benar?

```
Jawaban:


```

**B2** 🔴 TOP 30 hari itu **hari kalender atau hari kerja**? Kalau jatuh di Sabtu,
Minggu, atau libur nasional — maju atau mundur?

```
Jawaban:


```

**B3** 🟡 TOP default per customer berbeda-beda? Dari contoh: domestik 30 hari, EXIM 14
hari. Itu aturan umum atau kebetulan?

```
Jawaban:


```

## Bagian C — Data yang belum cocok

Bagian ini bukan menyalahkan siapa pun. Ini hal-hal yang kami temukan saat membaca
berkas, dan kami butuh tahu mana yang benar sebelum menyalinnya ke sistem.

**C1** 🔴 Job **ISLI-26.08-005** (Total Bangun Persada, Jakarta–Batam) punya **dua versi
biaya**:

| | Total biaya | GP | Margin |
|---|---|---|---|
| Versi di Excel | Rp 32.085.000 | Rp 5.915.000 | 15,57% |
| Versi tercetak | Rp 34.535.000 | Rp 3.465.000 | 9,12% |

> Bedanya satu baris: **CHARGE TRUCKING Rp 2.500.000** yang ada di versi cetak tapi
> tidak ada di Excel. Mana yang benar? Dan kalau versi cetak yang benar, kenapa Excel
> tidak ikut diperbarui?

```
Jawaban:


```

**C2** 🔴 Di summary report, GP bulan **Juni** menarik angka dari sel yang keliru —
mengambil Rp 1.000.000 padahal seharusnya Rp 23.500.000.

> Akibatnya total GP April–Juli tercatat **Rp 257.650.000**, padahal seharusnya
> **Rp 280.150.000**. Selisih **Rp 22.500.000** dalam empat bulan.
>
> Kami hanya perlu konfirmasi bahwa angka Rp 23.500.000 itu memang benar, supaya bisa
> dijadikan patokan uji sistem.

```
Jawaban:


```

**C3** 🔴 **Mata uang.** Pak Indra bilang "rupiah", tapi job sheet ekspor jelas memakai
USD dan dikonversi dengan kurs (contoh: USD 510 × kurs 18.200).

> Jadi: apakah job ekspor memang dikutip dalam USD lalu dikonversi? Kalau ya, **kurs
> diambil dari mana** — kurs pajak, kurs BI, kurs bank, atau kesepakatan dengan
> customer? Dan kurs ditetapkan pada tanggal apa?

```
Jawaban:


```

**C4** 🟡 Nama yang mungkin sama tapi ditulis berbeda:

- `MATEREE` / `MATEREE NUSANTARA` / `PT. MATEREE NUSANTARA UTAMA`
- `METTA LINTAS` / `META LINTAS`

> Sama atau beda? Yang benar yang mana?

```
Jawaban:


```

## Bagian D — Kas (sheet tersembunyi)

> Di dalam berkas summary ada satu halaman yang tidak terlihat, berisi catatan kas.
> Kami tidak yakin ini masuk lingkup sistem atau tidak, jadi kami tanyakan dulu
> daripada menebak.

**D1** 🔴 Catatan kas itu **masuk lingkup sistem** atau di luar? Kalau masuk, di fase
berapa?

```
Jawaban:


```

**D2** 🟡 Tercatat dropping **Rp 200.000.000** dari Pak Teguh, tapi pemakaian
**Rp 210.119.411**. Lebih pakai Rp 10.119.411. Itu wajar dan ditalangi, atau ada
dropping susulan yang belum tercatat?

```
Jawaban:


```

**D3** 🟡 Ada **"PENGEMBALIAN KE RATINDO Rp 70.000.000"**. Ratindo terdaftar sebagai
customer. Kenapa ada pengembalian uang ke customer dari kas dropping?

```
Jawaban:


```

**D4** 🟡 Pembayaran kapal di catatan kas tidak cocok dengan tabel di atasnya:

| Kapal | Selisih |
|---|---|
| KM SELILI BARU | Rp 1.837.000 |
| KM PULAU LAYANG | Rp 6.455.000 |
| KM UMBUL MAS | tidak muncul sama sekali |

```
Jawaban:


```

**D5** 🟡 Siapa **Pak Teguh** dan apa perannya dalam alur kas? Beliau calon pengguna
sistem?

```
Jawaban:


```

## Bagian E — Penomoran

**E1** 🔴 Nomor invoice `INVDOM` dan `INVEXP` — nomor urutnya **terpisah atau menyatu**?
Reset tiap bulan, tiap tahun, atau jalan terus?

```
Jawaban:


```

**E2** 🔴 Apakah ada **`INVIMP`** untuk impor? Kami belum punya contohnya.

> Kalau ada, mohon satu contoh invoice impor — sekalipun sudah lama.

```
Jawaban:


```

**E3** 🟡 Ada job **penagihan storage murni** tanpa pengiriman — GP-nya nol. Itu kategori
resmi, atau kasus khusus?

```
Jawaban:


```

---

# SESI 2 — Pak Fairol (Fairul Ikhsan)

> Sesi ini paling cepat kalau sambil buka laptop. Sebagian pertanyaannya cukup
> dijawab dengan menunjukkan layar.

## Bagian F — gsoft

> Ini satu-satunya hal yang benar-benar menghentikan pembangunan. Di berkas summary
> ada catatan: *"sudah di input .. Di report masuk bulan Mei .. di gsoft bulan april"*.
>
> Nama itu tidak pernah disebut di rapat mana pun. Kalau ternyata gsoft masih dipakai
> aktif, proyek ini bukan membangun dari nol — melainkan **migrasi**, dan itu mengubah
> harga, jadwal, dan cara kerjanya sejak hari pertama.

**F1** 🔴 **gsoft itu aplikasi apa?**

```
Jawaban:


```

**F2** 🔴 Masih dipakai sampai sekarang? Siapa saja yang memakai, dan untuk apa?

```
Jawaban:


```

**F3** 🔴 **Bisa kami lihat tampilannya?** Screenshot saja cukup. Kalau bisa export ke
Excel/CSV, itu lebih baik lagi.

```
Jawaban:


```

**F4** 🔴 Nomor `SEVFJK25040002` — itu dari gsoft? Apa arti tiap potongannya?

> Tebakan kami: `SE`=?, `VF`=?, `JK`=Jakarta, `25`=tahun 2025, `04`=April,
> `0002`=nomor urut. Benar?

```
Jawaban:


```

**F5** 🔴 Kenapa transaksi yang sama tercatat **Mei di report tapi April di gsoft**?
Apa aturan cut-off periodenya?

```
Jawaban:


```

**F6** 🟡 **"VFL INDONESIA"** tercatat sebagai pembuat asli berkas summary (Mei 2025).
Itu perusahaan lain, afiliasi, atau template warisan? Ada hubungannya dengan gsoft?

```
Jawaban:


```

## Bagian G — Berkas yang kami butuhkan

**G1** 🔴 **Mohon seluruh berkas `SO BULAN *.xlsx` di folder `D:\ISLI\SO 2026\`.**

> Ini permintaan paling penting nomor dua setelah gsoft.
>
> Berkas summary ternyata **menarik angka dari berkas lain** yang tidak ikut terkirim.
> Yang tertaut baru `SO BULAN APRIL 2026.xlsx` — isinya 12 halaman, satu halaman per job.
>
> **Di situlah rincian biaya per job yang sebenarnya berada.** Yang kami punya sekarang
> cuma ringkasannya. Tanpa berkas ini, migrasi data lama tidak mungkin akurat.
>
> Mohon April, Mei, Juni, Juli — semuanya.

```
Sudah dikirim? [ ] ya  [ ] belum   Kapan:
```

**G2** 🟡 Kenapa hanya April yang tertaut? Mei–Juli sepertinya diketik manual. Tautannya
putus, atau memang tidak pernah dibuat?

```
Jawaban:


```

**G3** 🟡 Mohon satu contoh **POD** (bukti terima barang) — difoto pakai HP juga cukup.

```
Sudah dikirim? [ ] ya  [ ] belum
```

**G4** 🟡 Kami sudah punya dua contoh invoice. Yang belum: contoh **SO (Sales Order)**
yang dikirim ke customer — kalau memang ada dokumen terpisah untuk itu.

> Kalau yang dimaksud "SO" selama ini adalah halaman job sheet di Excel itu sendiri,
> cukup dikonfirmasi — berarti tidak ada dokumen tambahan.

```
Jawaban:


```

## Bagian H — Penomoran job

**H1** 🔴 Nomor urut job untuk **domestik, ekspor, dan impor** — jalan sendiri-sendiri
atau satu deret?

> Kami menemukan **16 nomor job yang bertabrakan** di data. Kalau ketiganya memang
> punya deret sendiri, itu bukan kesalahan — dan sistem harus dirancang begitu sejak
> awal, bukan ditambal belakangan.

```
Jawaban:


```

**H2** 🔴 Nomor urut **reset tiap bulan atau tiap tahun**?

```
Jawaban:


```

**H3** 🟡 Kalau job **dibatalkan**, nomornya hangus atau dipakai ulang? Boleh ada nomor
yang bolong?

```
Jawaban:


```

## Bagian I — Orang & alur kerja

**I1** 🔴 **Siapa "Mundofir 01"?**

> Nama ini tercatat sebagai orang terakhir yang mengedit kedua invoice contoh, tapi
> tidak pernah disebut di rapat. Apa perannya? Beliau termasuk 4 pengguna sistem?

```
Jawaban:


```

**I2** 🟡 **"Cecilia Niken"** dan **"Niken Integra"** — orang yang sama dengan dua akun
komputer, atau dua orang berbeda?

```
Jawaban:


```

**I3** 🟡 Metadata menunjukkan invoice Materee butuh **349 menit** (hampir 6 jam) waktu
edit, sementara invoice Diametral hanya 1 menit.

> Apakah menyiapkan satu invoice memang bisa selama itu? Kalau ya — **bagian mana yang
> paling makan waktu?** Mengumpulkan biaya dari vendor? Menunggu POD? Menghitung pajak?
>
> Ini bukan pertanyaan iseng. Kalau satu invoice memang butuh berjam-jam, itu angka
> penghematan paling nyata yang bisa dibawa ke Pak Indra — dan jadi ukuran keberhasilan
> yang bisa dibuktikan setelah sistem jalan.

```
Jawaban:


```

**I4** 🟡 Untuk domestik, Pak Indra bilang "mostly" pakai ketiga leg (trucking + laut +
antar). **Kapan pengecualiannya?**

```
Jawaban:


```

**I5** 🟢 Dua kapal muncul di catatan realisasi tapi tidak ada di daftar job:
**KM LINTAS MAHAKAM** dan **KM ORIENTAL EMERALD**. Job yang mana?

```
Jawaban:


```

**I6** 🟢 Ada dua baris dengan **ETD tahun 2006**. Itu salah ketik untuk 2026?

```
Jawaban:


```

---

# SESI 3 — Pak Indra

> Sesi ini paling singkat tapi paling menentukan arah. Semua pertanyaan di sini adalah
> keputusan, bukan informasi — tidak ada yang bisa dijawab orang lain.

## Bagian J — Yang paling penting

**J1** 🔴 **Kenapa proyek sistem yang dulu berhenti?**

> Bapak pernah menyebut pernah mencoba membangun sistem bersama pengembang dari India
> dan Bu Niken, dan berhenti karena scope terus melebar.
>
> Ini pertanyaan paling berharga di seluruh dokumen ini, dan belum pernah ditanyakan
> sama sekali. Orang-orang yang sama masih terlibat sekarang. Kalau penyebabnya tidak
> diketahui, kemungkinan terulang tinggi.
>
> Yang ingin saya gali:
>
> - Sampai mana yang sempat jadi? Ada yang sempat dipakai?
> - Berapa lama berjalan sebelum berhenti?
> - Bagian mana yang paling sering berubah di tengah jalan?
> - Apa kejadian yang membuat Bapak akhirnya memutuskan berhenti?
> - Menurut Bapak, kesalahan itu lebih di sisi pengembang atau di sisi ISLI?
> - Kodenya masih ada?

```
Jawaban:




```

**J2** 🔴 Kalau biaya sudah terlanjur masuk ke job yang salah lalu perlu **dipindah ke
job lain** — sistem sebaiknya **melarang total**, atau **mengizinkan tapi wajib
persetujuan Bapak** dan tercatat?

> Rekomendasi saya: **izinkan dengan persetujuan dan jejak**. Melarang total terdengar
> aman, tapi biasanya berakhir dengan orang mengakalinya di luar sistem — dan itu lebih
> berbahaya karena tidak terlihat.

```
[ ] Larang total   [ ] Izinkan + persetujuan Bapak   [ ] Lainnya:
```

**J3** 🔴 **Siapa saja yang dapat akun, dan perannya apa?**

> Bapak menyebut 4 pengguna. Tapi di dokumen muncul 5 nama: Bapak, Bu Niken, Fairol,
> Mundofir, dan Lana. Siapa yang tidak dapat akun — atau ada nama yang sebenarnya orang
> yang sama?

| Nama lengkap | Email | Peran (Owner / Manajer / Staf) |
|---|---|---|
| | | Owner |
| | | |
| | | |
| | | |

**J4** 🔴 Kalau **Bapak sedang cuti atau di luar kota**, siapa yang boleh melakukan
persetujuan final?

> Kalau jawabannya "tidak ada", itu tidak masalah — tapi berarti pekerjaan berhenti
> menunggu Bapak. Saya perlu memastikan itu keputusan sadar, bukan kecelakaan yang baru
> disadari saat sudah terjadi.

```
[ ] Tidak ada, memang harus menunggu saya
[ ] Boleh didelegasikan ke:
[ ] Boleh, tapi hanya sampai nilai tertentu: Rp
```

**J5** 🔴 Kalau **Bu Niken sendiri yang membuat job**, siapa yang jadi persetujuan
pertama? Bapak merangkap, atau tahap pertama dilewati?

```
Jawaban:


```

**J6** 🔴 Selain Bapak, **siapa lagi yang boleh membuka dokumen yang sudah final**?

> Bu Niken mengusulkan alurnya: minta revisi ke vendor → ajukan → jelaskan ke Bapak →
> baru dibuka. Apakah alur itu yang mau dipakai?

```
Jawaban:


```

## Bagian K — Lingkup

**K1** 🔴 Data lama **April–Juli 2026** wajib dipindahkan ke sistem, atau mulai bersih
dari bulan berjalan?

> Rekomendasi saya: **mulai bersih**, data lama diimpor belakangan sebagai arsip baca-saja.
> Memindahkan data lama sambil membangun adalah salah satu cara paling umum sebuah
> proyek jadi molor — dan itu persis pola yang Bapak sebut di proyek sebelumnya.

```
[ ] Mulai bersih   [ ] Wajib pindah semua   [ ] Pindah sebagian:
```

**K2** 🟡 Perlu **unggah lampiran** (scan POD, invoice vendor, BL) ke sistem?

> Ini menambah biaya penyimpanan dan waktu pengembangan. Kalau tidak mendesak, saya
> sarankan masuk Fase 2.

```
[ ] Perlu di Fase 1   [ ] Cukup Fase 2   [ ] Tidak perlu
```

**K3** 🟡 **Staf boleh melihat GP (margin)?**

> Rancangan sekarang: **tidak boleh**. Tapi ada sisi lain — kalau staf yang menginput
> biaya tidak bisa melihat margin, mereka juga tidak bisa menangkap kalau ada angka
> yang jelas keliru. Bug Rp 22,5 juta yang saya temukan itu contohnya.

```
[ ] Tidak boleh sama sekali
[ ] Boleh lihat job yang dia input saja
[ ] Boleh semua
```

**K4** 🟡 Catatan kas (dropping, cicilan mobil, petty cash) — sistem perlu **memisahkan
biaya operasional job dari biaya perusahaan**?

```
Jawaban:


```

**K5** 🟡 Perlu **multi-cabang**? Sejauh ini asumsi saya: Bekasi saja, satu badan usaha.

```
[ ] Bekasi saja   [ ] Akan ada cabang:
```

**K6** 🟡 Target volume job per bulan **3 tahun ke depan** kira-kira berapa?

> Sekarang ±19/bulan. Saya merancang untuk 100/bulan — lima kali lipat. Cukup?

```
Jawaban:


```

## Bagian L — Setelah sistem jadi

> Bagian ini yang paling sering dilewati dan paling sering jadi masalah enam bulan
> kemudian. Saya lebih suka membahasnya sekarang, saat belum ada uang yang keluar.

**L1** 🔴 Akun **hosting dan database** dibuat atas nama **ISLI atau atas nama saya**?

> Rekomendasi kuat: **atas nama ISLI sejak hari pertama**, saya diundang sebagai
> kolaborator. Kalau dibuat atas nama saya lalu dipindah nanti, prosesnya sering tidak
> mulus — dan Bapak jadi bergantung pada saya untuk hal yang seharusnya milik ISLI.

```
[ ] Atas nama ISLI   [ ] Atas nama Alawi dulu
Email ISLI yang dipakai:
```

**L2** 🔴 Setelah serah terima, **siapa yang pegang akses database produksi**?

```
Jawaban:


```

**L3** 🔴 **Siapa yang membayar langganan bulanan?**

> Perkiraan Rp 400.000–800.000 per bulan (hosting + database + domain). Kecil, tapi
> kalau tidak jelas siapa yang bayar, sistem bisa mati mendadak cuma karena kartu
> kreditnya kedaluwarsa.

```
[ ] ISLI langsung   [ ] Lewat Alawi, ditagihkan   Kartu/rekening atas nama:
```

**L4** 🔴 **Berapa lama masa garansi** setelah serah terima?

> Usul saya: **60 hari untuk perbaikan bug**, di luar permintaan fitur baru. Perbedaan
> "bug" dan "fitur baru" akan saya tuliskan hitam di atas putih supaya tidak jadi
> perdebatan nanti.

```
[ ] 60 hari (usulan)   [ ] Lainnya:
```

**L5** 🔴 **Kalau sistem mati di jam kerja, prosedurnya apa?**

> Ini belum pernah dibahas sama sekali. Kalau tidak ada prosedurnya, yang terjadi
> biasanya: orang kembali ke Excel, dan data hari itu tidak pernah masuk kembali ke
> sistem.
>
> Usul saya: ada formulir kertas cadangan, dan aturan bahwa data wajib diinput ulang
> paling lambat hari berikutnya.

```
Jawaban:


```

**L6** 🟡 Siapa yang **melatih** Fairol, Lana, dan Mundofir? Bapak bilang manajer —
berarti Bu Niken. Beliau sudah tahu dan setuju?

```
Jawaban:


```

## Bagian M — Teknis yang butuh keputusan Bapak

**M1** 🟡 **Notifikasi** — Bapak sempat tanya apakah WhatsApp berbayar. **Ya, berbayar.**

> Sekitar Rp 400 per pesan, ditambah langganan penyedia Rp 300.000–600.000 per bulan.
> Untuk volume ISLI (±76 pesan/bulan) biaya pesannya cuma ±Rp 30.000 — yang mahal justru
> langganan bulanannya.
>
> Alternatifnya **notifikasi langsung di HP tanpa buka aplikasi** — seperti notifikasi
> WhatsApp, tapi dari sistem kita sendiri, dan **gratis**. Ditambah email sebagai
> cadangan.
>
> Rekomendasi saya: mulai dari yang gratis. Kalau tiga bulan berjalan ternyata Bapak
> merasa kurang, WhatsApp bisa ditambahkan belakangan.

```
[ ] Notifikasi HP + email (gratis) — usulan
[ ] Tetap mau WhatsApp
```

**M2** 🟡 **Accurate** — Bapak berlangganan yang mana: **Accurate Online** atau
**Accurate Desktop**?

> Kabar baik: Accurate Online punya jalur integrasi resmi. Yang perlu saya tahu:
>
> - Paket langganannya apa?
> - Siapa yang pegang akun administratornya?
> - Data mengalir **satu arah** (dari sistem kita ke Accurate) atau **dua arah**?
> - Yang dikirim apa saja — invoice penjualan, invoice pembelian, atau jurnal?

```
Jawaban:


```

**M3** 🟡 ISLI sudah pakai **Google Workspace** (email @isli.co.id lewat Google)?

> Kalau ya, login bisa pakai akun Google yang sudah ada — tidak perlu kata sandi baru,
> dan kalau ada karyawan keluar, aksesnya otomatis tertutup.

```
[ ] Ya, pakai Google   [ ] Tidak   [ ] Tidak tahu
```

**M4** 🟡 Akun Bapak sebaiknya pakai **verifikasi dua langkah**?

> Akun Bapak bisa membuka dokumen terkunci dan menyetujui final. Sebaiknya dilindungi
> lebih dari sekadar kata sandi.

```
[ ] Ya   [ ] Tidak perlu
```

**M5** 🔴 **Pertanyaan untuk konsultan pajak ISLI, bukan untuk Bapak langsung.**

> UU KUP Pasal 28 ayat (11) mewajibkan dokumen pembukuan disimpan **10 tahun** dan
> **di wilayah Indonesia** — termasuk yang berbentuk elektronik.
>
> Penyedia database yang saya rencanakan lokasi terdekatnya **Singapura**. Ada penyedia
> di Indonesia, tapi lebih mahal dan lebih repot.
>
> Pertanyaannya: apakah konsultan pajak ISLI menafsirkan aturan itu secara ketat?
> Jawabannya mengubah pilihan hosting, jadi lebih baik ditanyakan sekarang daripada
> setelah sistem jalan.

```
Jawaban konsultan pajak:


```

**M6** 🟢 Data harus disimpan berapa lama? Asumsi saya **10 tahun** mengikuti aturan
pajak, dan data tidak pernah benar-benar dihapus — hanya disembunyikan.

```
[ ] Setuju 10 tahun   [ ] Lainnya:
```

---

# Ringkasan — yang menghentikan pembangunan

Dari seluruh dokumen ini, hanya ada **satu** yang benar-benar menghentikan pekerjaan:

| | Pertanyaan | Ke | Kenapa menghentikan |
|---|---|---|---|
| **1** | **F1–F5 — gsoft itu apa** | Fairol | Kalau masih dipakai, ini proyek **migrasi**, bukan bangun baru. Harga, jadwal, dan cara kerjanya berubah total |

Satu tingkat di bawahnya — tidak menghentikan, tapi menentukan kualitas hasil:

| | Pertanyaan | Ke |
|---|---|---|
| **2** | **G1 — berkas `SO BULAN *.xlsx`** | Fairol |
| **3** | **J1 — kenapa proyek dulu gagal** | Pak Indra |
| **4** | **A1–A4 — aturan pajak & pembulatan** | Bu Niken |
| **5** | **L1–L5 — kepemilikan & serah terima** | Pak Indra |

Sisanya bisa dijawab sambil jalan.

---

## Untuk Alawi — setelah kuesioner kembali

1. Tiap jawaban yang masuk → jalankan `.clinerules/workflows/answer-question.md`
2. Aturan baru → pindahkan ke `docs/DOMAIN-RULES.md`, tandai ✅ TERBUKTI + sumbernya
3. Jawaban yang mengubah arsitektur → **ADR baru**, jangan edit ADR lama
4. Kalau **F1–F5 ternyata gsoft masih hidup** → hentikan semua pekerjaan teknis,
   tulis ulang `docs/PROPOSAL-PHASES.md` sebagai proyek migrasi, hitung ulang harga
   Fase 1 sebelum apa pun dikirim ke Pak Indra
5. Kalau **A2 (pembulatan) terjawab** → golden test Diametral bisa jadi hijau. Sampai
   itu, biarkan merah. **Jangan** akali dengan toleransi angka
