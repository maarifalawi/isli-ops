# DOMAIN-RULES.md — Aturan Bisnis ISLI

> **Kontrak antara agent dan kenyataan.** Setiap aturan di sini punya status:
>
> - ✅ **TERBUKTI** — diverifikasi dari dokumen asli, aman diimplementasikan.
> - ⚠️ **DUGAAN** — pola terlihat di data tapi belum dikonfirmasi klien.
> - 🔴 **BELUM DIKETAHUI** — **DILARANG diimplementasikan.** Blokir dan tanya.
>
> Agent: kalau kamu butuh aturan bertanda ⚠️ atau 🔴, **berhenti** dan tulis di
> `OPEN-QUESTIONS.md`. Jangan menebak.

---

## R1. Penomoran Job

### R1.1 Format ✅ TERBUKTI
```
ISLI-YY.MM-NNN[ (SUFFIX)]

ISLI   literal
YY     2 digit tahun   (26 = 2026)
MM     2 digit bulan   (01-12)
NNN    3 digit urut, zero-padded
SUFFIX opsional: (EXP) | (IMP) | (AF) | (SEAFREIGHT)
```
Contoh nyata: `ISLI-26.04-001`, `ISLI-26.05-001 (EXP)`,
`ISLI-26.07-003(AF)`, `ISLI-26.06-007 (SEAFREIGHT)`.

### R1.2 Counter terpisah per scope ✅ TERBUKTI
Ada **3 sequence paralel**: `DOM`, `EXP`, `IMP`.
Skrip audit menemukan **16 tabrakan** kunci `YY.MM-NNN` antar scope, mis.
`ISLI-26.05-001` (DOM) dan `ISLI-26.05-001 (EXP)` hidup berdampingan.

> **Implikasi teknis:** `UNIQUE(job_no)` **SALAH**.
> Kunci unik yang benar: `UNIQUE(seq_scope, year, month, running)`.

### R1.3 ✅ DIJAWAB 13 Agu 2026 — Reset counter

**JAWABAN: reset bulanan.** Dikonfirmasi klien langsung dari format
`ISLI-YY.MM-NNN`: `YY` = tahun, `MM` = bulan, `NNN` = urutan job ke berapa di
bulan itu (dimulai `001` lagi setiap bulan baru, per scope DOM/EXP/IMP).

### R1.4 Job batal 🔴 BELUM DIKETAHUI
Nomor hangus atau dipakai ulang? Boleh ada gap? Belum ada datanya.

### R1.5 Suffix tidak konsisten ⚠️ DUGAAN
Spasi sebelum kurung tidak konsisten: `ISLI-26.07-003(AF)` vs
`ISLI-26.06-007 (SEAFREIGHT)`. Sistem harus **menormalkan saat simpan** dan
merender ulang saat tampil. Jangan simpan string mentah sebagai kunci.

---

## R2. Penomoran Invoice

### R2.1 Format ✅ TERBUKTI
```
NNN-TIPE/JOB_NO/BULAN_ROMAWI/YYYY

NNN          3 digit urut invoice (BUKAN urut job)
TIPE         INVDOM | INVEXP
JOB_NO       nomor job lengkap termasuk suffix
BULAN_ROMAWI bulan TERBIT INVOICE dalam angka Romawi
YYYY         tahun terbit invoice
```

Contoh nyata:
- `017-INVDOM/ISLI-26.06-012/VII/2026`
- `004-INVEXP/ISLI-26.07-003(AF)/VII/2026`

### R2.2 Bulan Romawi = bulan invoice, bukan bulan job ✅ TERBUKTI
Job `ISLI-26.06-012` (Juni) → invoice bulan `VII` (Juli).

### R2.3 ✅ DIJAWAB 13 Agu 2026 — Counter invoice terpisah per tipe

**JAWABAN: sama seperti nomor job (R1.3)** — reset bulanan, per tipe
(`INVDOM`/`INVEXP`/`INVIMP`) terpisah.

### R2.4 ✅ DIJAWAB 13 Agu 2026 — Apakah ada `INVIMP`?

**JAWABAN: ya, ada**, mengikuti pola yang sama dengan `INVDOM`/`INVEXP`
(reset bulanan, counter sendiri).

---

## R3. Perpajakan

### R3.1 PPN 1,1% atas DPP ✅ TERBUKTI
```
ppn = round(dpp * 0.011)
```
Bukti (Invoice Materee): DPP 22.600.000 × 1,1% = 248.600 ✓
Bukti (Invoice Diametral): DPP 132.623.041 × 1,1% = 1.458.853,45 → 1.458.853 ✓

### R3.2 Reimbursement dikeluarkan dari DPP ✅ TERBUKTI
Invoice Materee:
```
FREIGHT JAKARTA-SAMARINDA   22.600.000   <- kena PPN
REIMBURSE INAP               1.000.000   <- TIDAK kena PPN
SUB TOTAL                   23.600.000
DPP                         22.600.000   <- reimburse dikeluarkan
```

### R3.3 Rumus Grand Total ✅ TERBUKTI
```
grand_total = sub_total + ppn - pph23_dipotong
```
Bukti Diametral: 132.623.041 + 1.458.853 − 2.652.461 = 131.429.433
(invoice tertulis 131.429.434 — **selisih Rp 1 karena pembulatan**). Lihat R3.6.

### R3.4 PPh 23 = 2% dari DPP ✅ TERBUKTI (nilainya)
132.623.041 × 2% = 2.652.460,82 → 2.652.461

### R3.5 Kapan PPh 23 dipotong 🔴 BELUM DIKETAHUI — **BLOCKER**
| Invoice | Customer | PPh 23 |
|---|---|---|
| `017-INVDOM/...` | PT Materee Nusantara Utama | **tidak dipotong** |
| `004-INVEXP/...` | PT Diametral Involute | **dipotong 2%** |

Hipotesis yang harus diuji ke Bu Niken:
1. Tergantung status PKP / jenis WP customer?
2. Tergantung jenis jasa (domestik vs ekspor)?
3. Kesepakatan per customer?
4. Tergantung apakah customer ditunjuk sebagai pemotong?

> **Agent: JANGAN pilih salah satu.** Sampai terjawab, `pph23_applicable`
> adalah field manual per invoice dengan default `false` dan wajib diisi user.

> ✅ **Dikonfirmasi klien 13 Agu 2026:** ini bukan cuma default sementara agen --
> memang begini desain yang diinginkan. Sistem TIDAK mencoba menghitung sendiri
> aturan hukum kapan PPh 23 berlaku. Tim ISLI yang menentukan lewat kolom/
> centang manual (`pph23_applicable`) di tiap invoice/job, sesuai keputusan
> mereka sendiri. Empat hipotesis di atas jadi bahan pengetahuan tim, bukan
> logika yang wajib dibangun ke sistem.

### R3.6 ✅ DIJAWAB 13 Agu 2026 — Pembulatan

**JAWABAN: bulatkan ke atas (ceiling), kalau memungkinkan.** Berlaku untuk
semua pembulatan pajak (PPN, PPh 23, grand total) di setiap invoice. Ini
menjelaskan selisih Rp 1 di invoice Diametral (R3.3): 2.652.460,82 dibulatkan
ke atas jadi 2.652.461, bukan ke angka terdekat. Implementasi: gunakan
`Math.ceil` (atau setara SQL `CEIL`) pada setiap nilai rupiah pecahan, bukan
`round()`.

### R3.7 PPh 23 sisi Buying ⚠️ DUGAAN
Job sheet punya kolom `PPH 23 - 2%` di tabel BUYING → ISLI juga memotong PPh 23
saat membayar vendor. Semua sel kosong di sampel, jadi mekanismenya belum jelas.

### R3.8 Apakah selalu 1,1%? 🔴 BELUM DIKETAHUI
Adakah jasa yang kena PPN 11% penuh atau 0% (ekspor jasa)? Semua sampel 1,1%.

---

## R4. Perhitungan GP

### R4.1 Definisi yang BENAR (usulan) ⚠️ PERLU PERSETUJUAN
```
selling_total = SUM(charge_line WHERE side=SELLING)          -- termasuk reimburse
buying_total  = SUM(charge_line WHERE side=BUYING)           -- termasuk at-cost
gp            = selling_total - buying_total
gp_pct        = gp / selling_total
```
**PPN tidak pernah masuk perhitungan margin.**

### R4.2 ✅ DIJAWAB SEBAGIAN 13 Agu 2026 — Definisi yang dipakai sekarang
```
Excel: GP   = E16 - D41   ; E16 = selling TANPA reimburse, D41 = SEMUA buying
Excel: NETT = G16 - D41   ; G16 = selling + PPN 1,1%   <-- PPN jadi margin
```
**Poin 1 (NETT memasukkan PPN ke margin) sudah dikonfirmasi klien: DISENGAJA,
bukan kekeliruan.** `NETT` dan `GP` memang dua metrik yang berbeda tujuan
secara sengaja — `GP` = margin murni sebelum pajak, `NETT` = margin yang
sudah memasukkan PPN keluaran (kemungkinan dipakai untuk gambaran kas/
cash-in, bukan profitabilitas murni). Sistem tetap menghitung dan menampilkan
**keduanya** sebagai kolom terpisah, bukan mengganti salah satu.

**Poin 2 (asimetri reimburse revenue vs cost) masih terbuka** — belum
ditanyakan ulang ke klien, tetap menunggu di ADR-0007.

### R4.3 At-cost / reimburse bermargin nol ✅ TERBUKTI
Pada job EXIM, baris at-cost identik di kedua sisi:
```
REIMBURSEMENT STORAGE   selling 530.580  buying 530.580
REIMBURSEMENT LIFT ON   selling 651.946  buying 651.946
INSURANCE               selling 1.611.151 buying 1.611.151
```
**Invariant:** untuk `charge_line.is_at_cost = true`, selling harus sama
dengan buying. Sistem wajib menolak kalau tidak sama.

---

## R5. Pencadangan vs Actual

### R5.1 Dua nilai per charge line ✅ TERBUKTI
Setiap baris biaya punya `pencadangan` (perkiraan) dan `actual` (realisasi),
plus `selisih = pencadangan - actual`.

### R5.2 Pemindahan biaya antar job ✅ TERBUKTI TERJADI
Bukti langsung dari catatan meeting:
```
TRUCKING (ADD COST) 1.300.000
  → DIPECAH KE 07-014   300.000
  → DIPECAH KE 07-016   300.000
  → sisa                700.000
  alasan: "KARENA GP 7,27%"

STORDEM 581.998 → "masuk ke 07-001"
SPIL DOORING    → "DIPECAH KE 07-011" / "DIPECAH KE 07-012", "KARENA GP 6%"
1.740.000       → "ditanggung agent"
```

### R5.3 ✅ DIPUTUSKAN 13 Agu 2026 — Kebijakan sistem

**JAWABAN: Opsi B — izinkan dengan jejak audit penuh** (lihat ADR-0006,
sekarang `Accepted`). Realokasi biaya antar job TETAP boleh terjadi seperti
praktik nyata di Excel, tapi wajib: job asal, job tujuan, nominal, alasan
tertulis, dan approval manajer sebelum berlaku. Diimplementasikan sebagai
tabel `cost_reallocations`.

**Konsekuensi tampilan:** setiap job menampilkan dua angka GP berdampingan —
GP asli (sebelum realokasi) dan GP setelah realokasi — dan dashboard bulanan
menambah metrik baru: total nilai realokasi per bulan. Ini memberi Pak Indra
visibilitas yang sebelumnya tidak pernah ada di Excel: seberapa sering dan
seberapa besar biaya digeser antar job, dan alasannya apa.

---

## R6. Alur approval

### R6.1 Rantai ✅ TERBUKTI
```
Maker → Approval 1 (manajer) → Approval Final (Pak Indra)
```

### R6.2 Reset saat dibongkar ✅ TERBUKTI
> *"Pada saat saya udah final, mau ngebongkar ini, semua orang mesti mulai
> prosesnya dari awal lagi."* — Pak Indra

**Invariant:** membuka dokumen final mereset SEMUA approval ke nol.
Bukan hanya approval terakhir.

### R6.3 Kunci setelah bayar ✅ TERBUKTI
> *"Kalau sudah terbayar harus terkunci."* — Bu Niken

### R6.4 Siapa boleh membuka ✅ DIFORMALKAN 13 Agu 2026 (transkrip 2)
Bu Niken menyebut alurnya: minta revisi ke vendor → mengajukan → jelaskan ke
Pak Indra → dibuka. Transkrip 2 menambah detail konkret:

> *"Kalau saya dulu tuh bikin berita acara. Berita acara tuh jadi misalkan PIC
> bersama salesnya... kita bikin berita acara, terus kemudian kita ajukan ke
> Pak Indra... di sini mau 100, mau 50, mau 300, mau sejuta pun tetap harus
> ada informasi ke Bapak."*

**Ini bukan sekadar penjelasan lisan** — PIC dan Sales membuat dokumen berita
acara BERSAMA, lalu itu yang diajukan. Tidak ada ambang nilai minimum yang
boleh lewat tanpa proses ini.

Diformalkan sebagai tabel `cost_reopen_requests` (lihat ERD): `requested_by`
(PIC), `co_signed_by` (Sales), `berita_acara_file_url` (wajib unggah),
`alasan` (wajib), `decided_by` (wajib Owner, ≠ requested_by). Baris lama tidak
diedit — riwayat pengajuan tetap ada meski ditolak.

---

## R7. Invoice vendor & anti-dobel bayar

### R7.1 Kasus 01A / 01B ✅ TERBUKTI (dari transkrip)
Vendor menerbitkan dua invoice bernomor mirip: `01A` (kena pajak) dan
`01B` (reimburse, tanpa pajak). Staf pernah salah input dengan nomor sama →
risiko bayar dobel.

**Invariant yang wajib:**
```
UNIQUE(vendor_id, vendor_invoice_no)
```
Ditambah peringatan (bukan blokir) untuk nomor yang mirip pada vendor sama.

### R7.2 Status bayar harus terlihat ✅ TERBUKTI
> *"Jangan sampai tim yang membayar bilang 'yaudah aku mah bayar bayar aja'."*

Sistem wajib menampilkan status bayar sebelum aksi pembayaran, dan menolak
pembayaran kedua atas invoice vendor yang sama.

### R7.3 Rekap pembayaran per vendor per bulan ✅ TERBUKTI (kebutuhan)
Diminta eksplisit oleh Bu Niken untuk keperluan pajak.

---

## R8. Multi-currency

### R8.1 Kurs disimpan per job ✅ TERBUKTI
Dua job EXIM memakai kurs berbeda: **18.300** dan **18.200**.
Kurs **tidak boleh** global; simpan di level job (`fx_rate_usd_idr`).

### R8.2 Konversi ✅ TERBUKTI
```
amount_idr = round(amount_usd * fx_rate)
```
Bukti: USD 510 × 18.300 = 9.333.000 ✓ ; USD 510 × 18.200 = 9.282.000 ✓

### R8.3 Sumber kurs 🔴 BELUM DIKETAHUI
Kurs pajak (KMK), kurs tengah BI, atau kurs kesepakatan? Siapa yang menetapkan?

---

## R9. Term of Payment

### R9.1 Nilai teramati ✅ TERBUKTI
| Segmen | TOP |
|---|---|
| Domestik (Materee) | 30 hari |
| EXIM (Diametral) | 14 hari |

Di weekly report, kolom `TOP` berisi 30 untuk hampir semua job domestik.

### R9.2 ✅ DIJAWAB 13 Agu 2026 — Basis hitung jatuh tempo

**JAWABAN: tidak ada rumus otomatis.** Jatuh tempo adalah tanggal yang
ditentukan manual oleh tim ISLI sendiri saat invoice dibuat — bukan dihitung
dari tanggal cetak/kirim/terima dengan rumus tetap. Ini menjelaskan tiga
rumus berbeda yang ditemukan di Excel: itu bukan tiga aturan yang saling
bertentangan, itu tiga kali orang mengetik tanggal secara manual dengan cara
berbeda-beda. Implementasi: `due_date` adalah field yang diisi user saat
menerbitkan invoice (boleh diberi tanggal usulan/default sebagai bantuan,
tapi selalu bisa ditimpa).

### R9.3 ✅ DIJAWAB 13 Agu 2026 — Hari kerja atau hari kalender?

**JAWABAN: tidak relevan** — karena R9.2 sudah menetapkan jatuh tempo
sebagai tanggal manual, tidak ada perhitungan hari kalender/kerja yang perlu
dibangun ke sistem sama sekali.

### R9.4 Prasyarat penerbitan invoice ✅ TERBUKTI
> *"POD harus kembali ke Jakarta setelah barang clear di-delivery, baru
> dibikin invoice, baru dikasih ke customer."*

**Invariant:** invoice tidak boleh terbit sebelum Proof of Delivery diterima.

### R9.4b Pengecualian: invoice duluan atas permintaan customer ✅ TERBUKTI (transkrip 2)
> *"Ada customer yang gitu... 'ini baru jalan nih kapal, tiba-tiba bilang
> tolong keluarin invoice, saya udah punya uangnya, saya mau bayar dulu'...
> dokumennya belum ada."*

R9.4 tetap berlaku sebagai jalur default. Tapi ada jalur KHUSUS: customer
kadang minta invoice terbit sebelum POD kembali karena ingin bayar lebih
cepat. Ini **tidak melonggarkan** R9.4 secara umum — tetap butuh approval
sebagai kompensasi tidak adanya POD saat itu.

Diterapkan sebagai `issued_before_pod` (boolean) + `early_issue_approved_by`
(wajib terisi kalau `issued_before_pod = true`, CHECK constraint di
`customer_invoices`). Approver tidak boleh sama dengan pembuat invoice.

---

## R10. Kombinasi leg yang sah ✅ DIPUTUSKAN 13 Agu 2026

Tiga potongan perjalanan:

| | Leg | Dari → ke |
|---|---|---|
| 1 | **Trucking** | gudang customer → pelabuhan asal |
| 2 | **Freight** | pelabuhan asal → pelabuhan tujuan (laut/udara) |
| 3 | **Delivery** | pelabuhan tujuan → alamat tujuan akhir |

### Matriks kombinasi — lengkap, tidak ada yang lain

| Kombinasi | Sah? | Keterangan |
|---|---|---|
| `1` saja | ✅ | trucking lokal saja |
| `2` saja | ✅ | port-to-port |
| `3` saja | ✅ | dooring saja |
| `1+2` | ✅ | gudang → pelabuhan tujuan |
| `2+3` | ✅ | pelabuhan asal → alamat tujuan |
| `1+2+3` | ✅ | door-to-door |
| `1+3` tanpa `2` | ❌ **MUTLAK DILARANG** | *"Satu tiga nggak mungkin."* — Pak Indra |
| tidak ada leg sama sekali | ❌ | minimal satu leg wajib dicentang |

### Dua tingkat penegakan yang BERBEDA — jangan dicampur

**Tingkat keras (database).** `1+3` tanpa `2` dan "nol leg" ditolak oleh CHECK
constraint `ck_legs`. Tidak ada jalan memutar, tidak ada peran yang bisa
menembusnya. Alasannya: itu mustahil secara fisik — barang tidak bisa berpindah
antar pelabuhan tanpa ada yang mengangkut.

**Tingkat lunak (aplikasi).** Job **domestik** default-nya tercentang `1+2+3`,
tapi **boleh diubah**. Kalau diubah, sistem mewajibkan pengisian
`leg_override_alasan`. Alasan itu masuk `audit_log`.

### Kenapa domestik TIDAK dipaksa keras

Di transkrip Pak Indra bilang *"domestik **mostly** door-to-door"*. Kata
"mostly" bukan "selalu". Kasus nyata yang mungkin terjadi: customer bawa sendiri
barangnya ke pelabuhan asal, ISLI hanya mengapalkan, customer ambil sendiri di
pelabuhan tujuan — itu domestik dengan **leg 2 saja**.

> **Prinsip:** sistem yang memblokir kejadian nyata mengajari orang berbohong
> kepadanya. Staf tidak akan menelepon manajemen; dia akan mencentang leg 1 lalu
> mengisi biaya trucking Rp 0. Sekali itu terjadi, data rusak tanpa jejak.
> Karena itu: **default + wajib alasan**, bukan blokir.

### Guna centang leg selain pencatatan

Centang leg menentukan **biaya apa yang seharusnya ada**. Kalau leg 1 dicentang
tapi tidak ada satu pun charge line bertipe trucking, sistem memunculkan
peringatan *"biaya trucking belum diisi"*. Ini menangkap biaya yang lupa dicatat
— penyakit yang Pak Indra keluhkan langsung di rapat.

**Q26 TERTUTUP** oleh keputusan ini. Setelah 3 bulan berjalan, laporan
pengecualian bisa dibaca dari `leg_override_alasan` untuk melihat apakah
pengecualian domestik benar-benar ada.

---

## R11. Job non-shipment

⚠️ DUGAAN: ditemukan job `ISLI-26.06-013` dengan selling = cost = 1.860.000,
GP = 0, keterangan penagihan storage/demurrage. Artinya nomor job juga dipakai
untuk penagihan murni tanpa pengiriman. Perlu dikonfirmasi apakah ini kategori
resmi atau workaround.

---

## R12. Identitas perusahaan (untuk invoice) ✅ TERBUKTI

```
PT. INTEGRA SINERGI LOGITAMA INDONESIA
Bank    : DANAMON
Cabang  : KCP HARAPAN INDAH - BEKASI
No. Acc : 003707391938
TTD     : PT. INTEGRA SINERGI LOGITAMA INDONESIA / FINANCE
```

🔴 **BELUM DIKETAHUI:** NPWP ISLI, alamat lengkap, telepon, email, website.
File `KOP Surat ISLI VALID.docx` isinya gambar tanpa teks — data ini harus
diminta terpisah.

---

## R13. Sistem lain: gsoft ✅ SELESAI — BUKAN BLOCKER

Ditemukan di sheet tersembunyi `BELUM ADA DI REPORT`:
```
SEVFJK25040002 == sudah di input .. Di report masuk bulan Mei .. di gsoft bulan april
```

Tiga fakta:
1. Ada aplikasi bernama **gsoft** yang sudah dipakai.
2. Ada **format nomor job kedua** (`SEVFJK25040002`) di luar format ISLI.
3. Ada **masalah cut-off periode** antara report dan gsoft.

**JAWABAN (Pak Indra lewat Alawi, 13 Agu 2026):**

> gsoft adalah sistem di perusahaan Pak Indra **yang sebelumnya**. Tidak ada
> hubungan sama sekali dengan ISLI.

**Akibatnya:**

1. Proyek ini **greenfield**. Bukan migrasi, bukan penggantian sistem.
   Arsitektur di `ARCHITECTURE.md` tetap berlaku tanpa perubahan.
2. Tabel `gsoft_mapping` **dibatalkan permanen**. Jangan pernah dibuat.
3. `SEVFJK25040002` adalah nomor **milik sistem lama**, bukan format kedua yang
   harus didukung. Sistem ISLI hanya mengenal `ISLI-YY.MM-NNN`.
4. Masalah cut-off Mei/April itu **catatan sisa** dari cara kerja lama, bukan
   aturan periode yang harus ditiru. Aturan periode ISLI tetap: tanggal invoice
   menentukan periode (P-INV-3).
5. Ini juga menjelaskan **Q36**: `DUMMY SUMMARY REPORT.xlsx` tercatat dibuat
   "VFL INDONESIA" pada Mei 2025 — template warisan dari tempat kerja lama,
   dibawa lalu dipakai ulang untuk ISLI.

> ⚠️ Satu hal yang **tetap** perlu diperhatikan: sheet tersembunyi
> `BELUM ADA DI REPORT` berisi baris yang **bukan** milik ISLI. Jangan pernah
> ikut dihitung. Angka Apr–Jul di `RECONCILIATION-REPORT.md` tidak terpengaruh
> karena sheet itu memang di luar rekap.


---

## R14. Laporan: rentang periode & peringkat ✅ DIPUTUSKAN 13 Agu 2026

Ditambahkan setelah klien menegaskan kebutuhan ini pada 13 Agu 2026. **Tidak
ada di rancangan semula** — rancangan lama hanya mengenal "per bulan tetap".

### R14.1 Filter rentang bebas
Semua halaman laporan memakai **rentang dari–sampai**, bukan satu bulan tetap.
Satuan terkecil: bulan. Default: bulan berjalan. Rentang tersimpan di URL supaya
bisa dibagikan dan di-bookmark.

### R14.2 Peringkat multi-sumbu
Satu halaman, satu pemilih rentang, beberapa tab sumbu. **Bukan** beberapa
halaman terpisah.

| Kelompok | Sumbu | Diurutkan berdasarkan |
|---|---|---|
| **Pendapatan** | customer, segmen (DOM/EXP/IMP), sales, rute | selling |
| **Belanja** | vendor | nilai invoice vendor |

> ⚠️ **Peringkat vendor BUKAN revenue, itu belanja.** Menggabungkan keduanya
> dalam satu label "Top Revenue" akan menyesatkan. Wajib dipisah dua kelompok.
> Kelompok belanja inilah yang Bu Niken butuhkan untuk pajak — *"dalam 1 bulan
> sudah bayar vendor A berapa banyak"* (R7.3).

### R14.3 Isi tiap baris peringkat
Untuk setiap entitas dalam rentang terpilih:

- jumlah job ("sudah berapa kali order")
- total selling, total cost, GP, GP%
- tanggal job pertama dan terakhir
- daftar tanggal seluruh job (di halaman detail)

### R14.4 Drill-down berlapis
```
Peringkat  →  daftar job entitas itu  →  costing satu job  →  invoice & pembayaran
```
Setiap angka di layar mana pun harus bisa diklik sampai ke baris penyusunnya.
Tidak boleh ada angka yang tidak bisa ditelusuri asalnya.

### R14.5 Angka dihitung, bukan disimpan
Semua agregat dihitung dari `job` dan `charge_line` saat diminta. **Dilarang**
menyimpan hasil rekap di tabel terpisah. Alasannya ada di
`RECONCILIATION-REPORT.md`: bug Rp 22,5 juta di Excel klien terjadi justru
karena angka rekap disimpan terpisah dari sumbernya.

### R14.6 Ketergantungan data
⚠️ Halaman ini **butuh data per job**. Yang tersedia sekarang hanya 4 titik
bulanan. Rancangan boleh dikerjakan; isinya baru ada setelah `SO BULAN *.xlsx`
diterima (Q41).

---

## R15. Field wajib pada baris Buying ⚠️ USULAN, MENUNGGU KONFIRMASI

Klien menyebut *"buying itu kan ada fields yang wajib"* tanpa menyebut daftarnya.
Daftar di bawah adalah **usulan**, belum dikonfirmasi.

### R15.1 Masalah pada rancangan lama
Di skema semula, `charge_line.vendor_id` **boleh kosong**. Artinya seseorang bisa
mencatat biaya Rp 9.577.000 tanpa menyebut vendornya siapa. Kalau itu terjadi,
rekap utang per vendor dan rekap PPh 23 per vendor langsung bolong — dan itu
tepat dua hal yang paling Bu Niken butuhkan.

### R15.2 Usulan aturan

| Field | Wajib? | Catatan |
|---|---|---|
| `charge_code` | ✅ selalu | sudah `NOT NULL` |
| `vendor_id` | ✅ **kalau charge code menandai butuh vendor** | lihat R15.3 |
| `pencadangan_idr` | ✅ selalu, boleh 0 | sudah `NOT NULL` |
| `keterangan` | ✅ kalau nilainya 0 atau negatif | memaksa penjelasan nilai aneh |
| `actual_idr` | ❌ boleh kosong | terisi saat invoice vendor masuk |
| `is_reimburse` | ✅ selalu | default dari master charge code |

### R15.3 Kolom baru `charge_codes.butuh_vendor`
Kewajiban vendor **tidak sama untuk semua kode biaya**. Contoh dari job
`ISLI-26.08-005`: `MATERAI 29.000` dan `HANDLING OPS 100.000` kelihatannya biaya
internal tanpa vendor, sedangkan `OF ICON 9.577.000` jelas ada vendornya.

Karena itu kewajiban ditentukan **per kode biaya**, bukan sebagai aturan global.
Default kolom ini `true` — lebih aman ketat lalu dilonggarkan daripada sebaliknya.

🔴 **Yang harus dikonfirmasi Bu Niken:** dari 43 kode biaya di
`fixtures/charge-codes.csv`, mana saja yang **boleh** tanpa vendor?

### R15.4 Aturan validasi, bukan CHECK constraint
Kewajiban `vendor_id` ditegakkan di **lapis aplikasi**, bukan database, karena
syaratnya bergantung pada baris master lain. Migrasi data historis juga akan
gagal total kalau ini dijadikan `NOT NULL` — data lama banyak yang tidak
mencantumkan vendor.

### R15.5 Kategori kode biaya: FIXED vs OPSIONAL ✅ DIPUTUSKAN 13 Agu 2026 (transkrip 2)
> *"Ocean Freight, BLTH, CLSSS, trucking, during, segel, terus yang lain-lain
> itu sudah fix ya. Fix itu artinya pasti akan muncul dalam setiap jobnya ini.
> Memang ada additional cost-nya, jadi misalkan kayak... uang makan supir...
> biaya timbang... additional freight. Itu memang biaya-biaya yang, kalau
> boleh, opsional."*

Ditambahkan kolom `charge_codes.kategori` (`FIXED` | `OPSIONAL`):
- **FIXED** — baris yang selalu diharapkan muncul di setiap job (contoh:
  Ocean Freight, BL, THC, LSS, trucking, dooring, segel). Form input boleh
  menyiapkan baris-baris ini secara otomatis per leg.
- **OPSIONAL** — ad-hoc, diinput bebas hanya kalau kejadiannya memang muncul
  (contoh: uang makan supir, biaya timbang, additional freight, biaya
  perpindahan alamat).

Default kolom ini `OPSIONAL` untuk kode baru — lebih aman menganggap kode
belum dikenal sebagai ad-hoc daripada diam-diam mewajibkannya muncul di
setiap job. Klien belum menandai mana dari 43 kode yang FIXED — lihat Q72.

---

## R16. Invoice susulan / koreksi (⚠️ sebagian masih menunggu jawaban)

Ditambahkan 13 Agu 2026. Kasus konkret dari klien: invoice sudah dicetak dan
terkunci dengan nominal Rp 15.000.000, padahal seharusnya Rp 16.000.000.
Kekurangan Rp 1.000.000 ditagih **di bulan berikutnya**, memakai **nomor invoice
yang benar-benar identik** dengan invoice pertama, dibedakan lewat label.

### R16.1 Kenapa ini tidak bisa jadi baris `customer_invoice` baru
Konfirmasi klien: nomornya **benar-benar identik**, bukan diberi akhiran seperti
`-R1`. Tapi `uq_inv UNIQUE(inv_type, issue_year, running)` di tabel
`customer_invoice` justru **menolak** dua baris dengan nomor identik —
kalau dipaksa masuk situ, sistem akan mengira itu duplikat seperti kasus
vendor 01A/01B (V-INV-1), padahal di sini duplikasi itu **disengaja dan sah**.

### R16.2 Solusi: tabel terpisah, bukan invoice mandiri
Dibuat tabel baru `customer_invoice_addendum` yang **merujuk** ke invoice asal
(`original_invoice_id`), bukan berdiri sendiri:

- **Nomor yang ditampilkan** disalin dari invoice asal saat mencetak — tidak
  disimpan ulang sebagai teks bebas, supaya tidak ada risiko salah ketik.
- **Label pembeda** (`label_internal`, contoh `SUSULAN-1`) wajib diisi. Tanpa
  label, dua dokumen dengan nomor sama tidak bisa dibedakan saat diaudit.
- **Kunci unik sebenarnya** ada di `(original_invoice_id, addendum_seq)`, bukan
  di teks nomor invoice. Ini yang membuat nomor boleh identik tanpa membuka
  gembok invoice pertama (I-INV-1 tetap berlaku — invoice pertama TIDAK diubah).
- **Alasan wajib** (`alasan`), masuk `audit_log`, sama seperti pola
  `leg_override_alasan` (R10) dan pola unlock (R6.2).

### R16.3 🔴 BELUM DIJAWAB — pajak atas selisih
Klien: *"ini gua gatau lagi, dia bilangnya gitu doang"* — Pak Indra/Bu Niken
belum menjelaskan apakah Rp 1 juta ini kena PPN/PPh lagi.

**Default yang dipakai sampai ada jawaban:** selisih dihitung sebagai
**kejadian pajak baru dan berdiri sendiri** — DPP-nya adalah nilai selisih itu
sendiri, dikenakan PPN 1,1% (dan PPh 23 kalau `pph23_applicable` job-nya true),
memakai `tax_rule_version` yang berlaku **saat addendum diterbitkan**, bukan
versi yang berlaku saat invoice pertama diterbitkan.

Alasan memilih default ini: I-INV-1 sudah membekukan DPP invoice pertama
supaya tidak ada yang mengubah riwayat yang sudah dilaporkan. Menghitung ulang
pajak invoice pertama untuk mengakomodasi Rp 1 juta akan melanggar aturan itu
sendiri. Memperlakukan selisihnya sebagai transaksi pajak baru adalah satu-
satunya cara yang **tidak** membongkar sesuatu yang sudah beku.

⚠️ **Ini asumsi, bukan konfirmasi klien.** Kalau Bu Niken bilang selisih ini
tidak boleh kena pajak lagi (karena sudah termasuk di penghitungan pertama),
aturan ini harus diubah sebelum Fase yang membangun invoice berjalan. Lihat Q69.

### R16.4 Yang TIDAK berubah
Klien menegaskan **hanya nomor invoice yang sama** — nomor job (`ISLI-26.07-
001`) TIDAK ikut disamakan atau diduplikasi. Addendum tetap mewarisi
`job_id` dari invoice asalnya (satu job, dua dokumen penagihan), tidak
membuat job baru dan tidak memanggil ulang penomoran job.

### R16.5 Approval
Mengikuti pola R-A1 (pembuat ≠ penyetuju): addendum dibuat oleh Maker/Finance,
tapi **tidak berlaku (belum `ISSUED`)** sampai disetujui Manager atau Owner.
Berbeda dari pola dua-tingkat penuh (Maker→Manager→Owner) di R6, karena ini
koreksi nilai kecil, bukan job baru — ⚠️ **tingkat approval ini juga asumsi,
belum dikonfirmasi klien.**

### R16.6 Cetakan
Dokumen cetak addendum menampilkan nomor invoice yang identik dengan invoice
asal, **plus label pembeda terlihat** di kepala dokumen (misal "SUSULAN 1 dari
INVOICE 017-INVDOM/..."). ⚠️ **Asumsi:** label ini terlihat oleh customer,
bukan hanya catatan internal — karena kalau customer menerima dua kertas
dengan nomor sama tanpa pembeda apa pun, itu berpotensi menyulitkan customer
sendiri saat mereka mencocokkan ke pembukuan mereka.
---

## R17. Invoice vendor susulan / dipecah antar bulan ✅ DIPUTUSKAN 13 Agu 2026 (transkrip 2)

Simetris dengan R16, tapi di sisi vendor (biaya), bukan customer (penjualan).

### R17.1 Kasus klien
> *"Dealingnya tracking nih, Rp1.250.000. Ternyata dia itu typo, maunya nagih
> Rp1.500.000, tapi keketiknya Rp1.250.000... Rp250.000-nya kita masukkan di
> bulan Juli, tapi dengan nomor invoice yang sama... padahal kan sebenarnya
> ini satu."*

Berbeda dari R7.1 (kasus 01A/01B, dua nomor **berbeda** yang mirip — itu wajib
ditolak kalau disamakan). Di sini vendor sengaja memakai **satu nomor yang
sama** untuk menagih sisa di periode berikutnya.

### R17.2 Solusi: tabel `vendor_invoice_addenda`, bukan baris `vendor_invoices` baru
`uq_vendor_invoice UNIQUE(vendor_id, vendor_invoice_no)` tetap berlaku penuh —
ini yang mencegah dobel-bayar tak sengaja (R7.1) dan TIDAK boleh dilonggarkan.
Addendum merujuk ke `original_vendor_invoice_id`, kunci uniknya
`(original_vendor_invoice_id, addendum_seq)` — bukan di teks nomor invoice.

### R17.3 Kuota belum dibayar
> *"Yang penting pada saat kita panggil itu, bahwa kamu tuh masih punya kuota
> nih, Rp200.000 yang belum dibayar."*

Tim pembayar harus bisa melihat sisa kuota saat memanggil nomor invoice
vendor: `jumlah_idr` invoice asal dikurangi total addendum yang sudah
`dibayar_at` terisi. Ini dihitung saat tampil, **tidak disimpan** sebagai
kolom — mengikuti prinsip R14.5 (angka dihitung, bukan disimpan).

### R17.4 Yang TIDAK berubah
Sama seperti R16.4: `vendor_id` dan job yang direferensikan lewat
`vendor_invoice_lines` tidak berubah. Hanya nomor invoice vendor yang boleh
identik antar baris addendum.

### R17.5 Approval
Mengikuti pola R16.5: dibuat oleh Maker, disetujui Manager/Owner (≠ pembuat).
⚠️ Asumsi, belum dikonfirmasi klien secara eksplisit untuk sisi vendor — lihat Q73.

