# CONTEXT.md — Bahasa Bersama (Ubiquitous Language) ISLI

> Dokumen paling penting di repo ini. Tujuannya: agent dan manusia memakai
> **satu kosakata yang sama**. Kalau sebuah konsep tidak ada di sini,
> konsep itu belum ada di sistem.
>
> Sumber: transkrip meeting 13 Agu 2026, job sheet asli, 2 invoice asli,
> weekly report, dan 8 halaman catatan tangan meeting.
>
> **STATUS:** v0.1 — banyak entri bertanda ⚠️ masih perlu konfirmasi klien.

---

## 1. Entitas inti

| Istilah | Definisi | Catatan penting |
|---|---|---|
| **Job** | Satu pekerjaan pengiriman end-to-end untuk satu customer. Unit terkecil yang punya GP. | Disebut juga "Sales Order" / "SO" di lembar kerja. Kita pakai **Job** di kode. |
| **Job Number** | Identitas job. Format `ISLI-YY.MM-NNN` + suffix opsional. | Contoh: `ISLI-26.08-005`, `ISLI-26.05-001 (EXP)`. Lihat ADR-0002. |
| **Sales Order (SO)** | Lembar kerja fisik/Excel berisi Selling + Buying satu job. | Padanan digital = halaman detail Job. Jangan bikin entitas terpisah. |
| **Selling** | Sisi pendapatan job: apa yang ditagih ke customer. | Terdiri dari beberapa `Charge Line` bertipe SELLING. |
| **Buying** | Sisi biaya job: apa yang dibayar ke vendor. | Terdiri dari beberapa `Charge Line` bertipe BUYING. |
| **Charge Line** | Satu baris biaya/pendapatan pada job. | **Inti model data.** Punya `charge_code`, `counterparty`, `amount`, flag pajak. |
| **Charge Code** | Kode jenis biaya, mis. `OF`, `THC`, `DOORING`. | Master data. ±40 kode teridentifikasi. Lihat `fixtures/charge-codes.csv`. |
| **Charge To** | Pihak yang dibebani baris tersebut. | Di Selling = customer. Di Buying = vendor. Kolom asli bernama `CHARGE TO`. |
| **GP** | Gross Profit = Total Selling − Total Buying. | ⚠️ Definisi saat ini di Excel tidak konsisten. Lihat ADR-0007. |
| **NETT** | Istilah klien untuk margin setelah PPN ditambahkan ke selling. | ⚠️ **Secara akuntansi salah.** Lihat ADR-0007 dan TEMUAN 9. |

---

## 2. Segmentasi bisnis

| Istilah | Definisi |
|---|---|
| **Domestik (DOM)** | Pengiriman dalam negeri, mis. Jakarta → Banjarmasin. Hampir selalu door-to-door. |
| **EXIM** | Payung untuk Export dan Import. |
| **Export (EXP)** | Pengiriman keluar Indonesia, mis. Jakarta → Manila. |
| **Import (IMP)** | Pengiriman masuk ke Indonesia. |
| **Leg 1 / Trucking** | Warehouse asal → pelabuhan asal. Di transkrip salah dengar jadi "tracking". |
| **Leg 2 / Freight** | Pelabuhan asal → pelabuhan tujuan. Sea freight atau air freight. |
| **Leg 3 / Delivery** | Pelabuhan tujuan → alamat akhir. Sering disebut **Dooring**. |
| **Kombinasi leg yang sah** | `1`, `2`, `3`, `1+2`, `2+3`, `1+2+3`. **`1+3` tanpa `2` TIDAK SAH.** |

> ⚠️ **PERINGATAN untuk agent:** model "3 leg" ini adalah cara Pak Indra
> menjelaskan bisnisnya secara lisan. **Struktur biaya sebenarnya jauh lebih
> rinci** (14–24 baris per job). Jangan modelkan biaya sebagai tiga kolom.
> Modelkan sebagai `charge_line` dengan `leg` sebagai atribut opsional.

---

## 3. Jenis layanan

| Kode | Arti |
|---|---|
| **FCL** | Full Container Load — satu kontainer penuh untuk satu customer. |
| **LCL** | Less than Container Load — muatan gabungan, dihitung per m³. |
| **A/F** | Air Freight. Muncul sebagai suffix `(AF)` pada nomor job. |

Sumber: dropdown eksplisit di job sheet — `SERVICE (pilihan (FCL, LCL, A/F))`.

---

## 4. Kosakata pelabuhan & shipping

| Istilah | Arti |
|---|---|
| **POL** | Port of Loading — pelabuhan muat. |
| **POD** | Port of Discharge — pelabuhan bongkar. |
| **STFG** | Stuffing — proses memasukkan barang ke kontainer. `STFG DATE` = tanggal stuffing. |
| **ETD** | Estimated Time of Departure. |
| **Shipper** | Pengirim barang. |
| **CNEE / Consignee** | Penerima barang. |
| **Vessel** | Nama kapal + nomor voyage, mis. `KM. ICON IBRANI V.81`. |
| **Ship Line / Pelayaran** | Perusahaan pelayaran, mis. ICON, SPIL, TEMAS, MERATUS. |
| **QTY CTR** | Jumlah & ukuran kontainer, mis. `2X20'`, `1X21'`. |
| **Agent** | Mitra forwarder di sisi lain (asal/tujuan). Kadang menanggung sebagian biaya. |

---

## 5. Charge code — kelompok biaya

> Daftar lengkap + atribut pajak ada di `fixtures/charge-codes.csv`.
> Di bawah ini hanya glosarium artinya.

### 5.1 Freight & pelayaran
| Kode | Arti |
|---|---|
| **OF** | Ocean Freight — biaya angkut laut. |
| **BL** | Bill of Lading — biaya penerbitan dokumen B/L. |
| **TELEX FEE** | Biaya telex release B/L. |
| **LSS** | Low Sulphur Surcharge — biaya tambahan bahan bakar rendah sulfur. |
| **TOESLAG** | Surcharge/biaya tambahan pelayaran (istilah Belanda, masih dipakai). |
| **APBS** | Alur Pelayaran Barat Surabaya — retribusi alur pelayaran. |
| **DO** | Delivery Order. |

### 5.2 Terminal & pelabuhan
| Kode | Arti |
|---|---|
| **THC** | Terminal Handling Charge. Varian: `THC LOLO JKT`, `THC TRANSIT`, `THC SURABAYA`. |
| **THD** | Terminal Handling Destination — THC di pelabuhan tujuan. |
| **LOLO** | Lift On / Lift Off — biaya angkat-turun kontainer. |
| **STORDEM** | **Stor**age + **Dem**urrage — biaya penumpukan & keterlambatan pengembalian kontainer. |
| **CLEANING** | Pembersihan kontainer. |
| **SEGEL** | Segel kontainer (bhs. Inggris: SEAL). |
| **PENITIPAN CONTAINER** | Biaya titip kontainer. |

### 5.3 Darat
| Kode | Arti |
|---|---|
| **TRUCKING** | Angkutan darat, umumnya leg 1. |
| **DOORING** | Pengantaran dari pelabuhan tujuan ke alamat penerima (leg 3). |
| **ADD FREIGHT** | Additional freight — tambahan di luar kesepakatan awal. |
| **ADD COST PICK UP EMPTY** | Biaya tambahan ambil kontainer kosong. |
| **UM SUPIR** | Uang Makan Supir. |
| **BIAYA TIMBANG** | Biaya jembatan timbang. |

### 5.4 Dokumen & kepabeanan
| Kode | Arti |
|---|---|
| **PEB** | Pemberitahuan Ekspor Barang — dokumen pabean ekspor. |
| **PIB** | Pemberitahuan Impor Barang — dokumen pabean impor. |
| **COO** | Certificate of Origin — surat keterangan asal barang. |
| **PPFTZ** | Dokumen pabean kawasan bebas (Free Trade Zone), dipakai untuk Batam. |
| **DOC** | Biaya dokumen umum. |
| **INSURANCE** | Asuransi muatan. Pada job EXIM diteruskan **at cost** (selling = buying). |

### 5.5 Internal & administrasi
| Kode | Arti |
|---|---|
| **HANDLING** | Jasa handling ISLI. |
| **HANDLING OPS FREELANCE** | Upah petugas lapangan lepas. |
| **ADMINISTRASI** | Biaya administrasi. |
| **MATERAI cadangan pelayaran** | Materai untuk dokumen pelayaran. |
| **MATERAI cadangan invoicing** | Materai untuk invoice ke customer. |
| **DELIVERY CHARGE** | Ongkos kirim dokumen/invoice fisik (TIKI, LION Parcel). |

---

## 6. Pencadangan vs Actual ⚠️ KONSEP KRITIS

| Istilah | Definisi |
|---|---|
| **Pencadangan** | Nilai biaya yang **diperkirakan** saat job dibuat, sebelum invoice vendor datang. Bahasa akuntansi: accrual/provisi. |
| **Actual** | Nilai biaya **sebenarnya** setelah invoice vendor diterima. |
| **Selisih** | `Pencadangan − Actual`. Positif = hemat, negatif = boncos. |
| **Dipecah** | Praktik memindahkan sebagian biaya dari satu job ke job lain. Contoh nyata dari catatan meeting: *"TRUCKING (ADD COST) 1.300.000 → DIPECAH KE 07-014 300.000, DIPECAH KE 07-016 300.000, KARENA GP 7,27%"*. |
| **Ditanggung agent** | Biaya yang tidak dibebankan ke job karena ditanggung mitra. |

> 🔴 **Ini adalah keputusan produk paling berat.** Praktik "dipecah" secara
> efektif adalah *earnings management* di level job. Sistem harus memutuskan:
> melarang, atau mengizinkan dengan jejak audit wajib. Lihat **ADR-0006**.
> Jangan implementasikan apa pun sebelum ADR-0006 berstatus `Accepted`.

---

## 7. Pajak Indonesia

| Istilah | Definisi |
|---|---|
| **DPP** | Dasar Pengenaan Pajak — basis perhitungan PPN. |
| **DPP Nilai Lain** | Basis khusus jasa freight forwarding = 10% dari nilai tagihan, sehingga PPN efektif = 11% × 10% = **1,1%**. |
| **PPN / VAT 1,1%** | Pajak Pertambahan Nilai efektif untuk jasa forwarding. **Ditambahkan** ke tagihan. |
| **PPh 23 (2%)** | Pajak Penghasilan Pasal 23 atas jasa. **Dipotong** dari tagihan oleh pihak pembayar. |
| **Reimbursement / At Cost** | Biaya yang diteruskan ke customer tanpa margin. **Tidak masuk DPP** sehingga tidak kena PPN. |
| **NPWP** | Nomor Pokok Wajib Pajak. Kunci identitas perpajakan customer & vendor. |
| **Bukti Potong** | Dokumen bukti pemotongan PPh 23. |
| **Terbilang** | Nominal dieja dalam huruf bahasa Indonesia. Wajib ada di invoice. |
| **Materai** | Bea meterai pada dokumen invoice. |

---

## 8. Alur dokumen & pembayaran

| Istilah | Definisi |
|---|---|
| **POD (dokumen)** | **Proof of Delivery** — bukti barang diterima. ⚠️ Jangan bingung dengan POD = Port of Discharge. Di kode: `proofOfDelivery` vs `portOfDischarge`. |
| **TOP** | Term of Payment — tempo pembayaran dalam hari. Domestik 30 hari, EXIM 14 hari (dari 2 invoice sampel). |
| **Tgl Jatuh Tempo** | Tanggal invoice harus dibayar. |
| **Usia Jatuh Tempo** | Umur tunggakan. Nilai `LATE 34 HARI` muncul di report. |
| **Termin** | Kesepakatan waktu bayar. Berbeda per jenis biaya: sea freight cash, trucking tempo, delivery tempo. |
| **INVDOM / INVEXP** | Penanda jenis invoice pada nomor invoice. |
| **Invoice Reimburse** | Invoice terpisah khusus baris at-cost, tanpa PPN. |
| **Dropping** | Setoran dana masuk ke kas operasional. Contoh di data: `DROPPING 200.000.000 DARI PAK TEGUH`. |

---

## 9. Peran & approval

| Istilah | Definisi |
|---|---|
| **Maker** | Staf yang membuat job/costing pertama kali. |
| **Approval 1** | Manajer yang menyetujui pertama. |
| **Approval Final** | Pak Indra (owner). Setelah final, dokumen **terkunci**. |
| **Unlock Request** | Permintaan formal membuka dokumen yang sudah final. Wajib alasan + persetujuan Approval Final. |
| **Terkunci** | Status di mana dokumen tidak bisa diubah. Kutipan Bu Niken: *"kalau sudah terbayar harus terkunci"*. |

---

## 10. Istilah yang DILARANG dipakai di kode

| Jangan pakai | Pakai ini |
|---|---|
| `tracking` (untuk angkutan darat) | `trucking` |
| `costItem`, `expense`, `fee` | `chargeLine` |
| `estimate`, `provision` | `pencadangan` |
| `POD` tanpa kualifikasi | `proofOfDelivery` atau `portOfDischarge` |
| `tax` generik | `ppn` atau `pph23` (eksplisit) |
| `total` generik pada uang | `sellingTotal`, `buyingTotal`, `dpp`, `grandTotal` |
| `SalesOrder` sebagai entitas terpisah | `Job` |

---

## 11. Orang & organisasi

| Nama | Peran |
|---|---|
| **PT. Integra Sinergi Logitama Indonesia (ISLI)** | Perusahaan klien. |
| **Pak Indra** | Pemilik. Approval final. Pengguna utama laporan. |
| **Bu Niken** ("Din") | Finance/Accounting. Sumber kebenaran aturan pajak & pembayaran. |
| **Fairol** | PIC data operasional. |
| **Lana** | Staf operasional. |
| **Alawi** | Pengembang sistem (kita). |
| **Pak Teguh** | ⚠️ Muncul di sheet kas sebagai sumber dropping dana. Perannya belum jelas. |
| **Pak Bagas** | Relasi eksternal, memakai sistem keuangan "level B". |
| **Accurate** | Software akuntansi kelas UKM yang disebut sebagai target integrasi Phase 3. |
| **gsoft** | ✅ Sistem di perusahaan Pak Indra **sebelumnya**. Tidak ada kaitan dengan ISLI. Dijawab 13 Agu 2026. Bukan blocker. |
