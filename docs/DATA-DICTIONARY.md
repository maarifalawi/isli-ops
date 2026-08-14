# DATA-DICTIONARY.md

> Pemetaan dari kolom Excel asli → field sistem. Dipakai saat menulis importer
> dan saat memverifikasi bahwa tidak ada data yang hilang.

## 1. Job sheet — header

| Label Excel | Field sistem | Tipe | Catatan |
|---|---|---|---|
| `NO SO` | `job.job_no` | TEXT | diurai jadi 4 kolom komponen |
| `SERVICE` | `job.service_type` | ENUM | dropdown asli: FCL, LCL, A/F |
| `SHIPPER` | `job.shipper` | TEXT | ⚠️ belum dinormalisasi jadi master |
| `CNEE` | `job.consignee` | TEXT | ⚠️ idem |
| `POL` | `job.pol_id` | FK port | |
| `POD` | `job.pod_id` | FK port | Port of Discharge |
| `STFG DATE` | `job.stuffing_date` | DATE | |
| `ETD` | `job.etd` | DATE | ⚠️ 2 baris bertahun 2006 |
| `VESSEL` | `job.vessel` | TEXT | "KM. ICON IBRANI V.81" |
| `SHIP LINE` / `PELAYARAN` | `job.ship_line_id` | FK | |
| `QTY CTR` | `job.qty_ctr` | TEXT | "2X20'" |
| `KURS` | `job.fx_rate_usd_idr` | BIGINT | per job |
| `SALES` | `job.sales_user_id` | FK | kode: KIM, VIN, RIK, YUD |

## 2. Job sheet — tabel SELLING

| Label Excel | Field sistem | Catatan |
|---|---|---|
| `DESCRIPTION` | `charge_line.description` | dipetakan ke `charge_code` |
| `QTY` | `charge_line.qty` | |
| `CHARGE TO` | — | customer, sudah ada di header job |
| `(USD)` | `charge_line.amount_original` | bila `currency='USD'` |
| `AMOUNT` | `charge_line.amount_idr` | |
| `TAX 1.1%` | dihitung | jangan diimpor, hitung ulang |
| `FINAL AMOUNT` | dihitung | jangan diimpor |

> Kolom pajak **sengaja tidak diimpor**. Sistem menghitung ulang. Kalau hasil
> hitung berbeda dari Excel, itu temuan yang harus ditandai, bukan diabaikan.

## 3. Job sheet — tabel BUYING

| Label Excel | Field sistem | Catatan |
|---|---|---|
| `DESCRIPTION` | `charge_line.description` | |
| `CHARGE TO` | `charge_line.vendor_id` | ⚠️ perlu normalisasi nama |
| `AMOUNT` | `charge_line.pencadangan_idr` atau `actual_idr` | ⚠️ di Excel ambigu, satu kolom dipakai untuk dua makna |
| `NO INV` | `vendor_invoice.vendor_invoice_no` | |
| `TGL PEMBAYARAN` | `payment_out.paid_date` | |
| `PPH 23 - 2%` | `charge_line.pph23_withheld_idr` | kosong di semua sampel |
| `PEMBAYARAN` | `payment_out.amount_idr` | |

> **Temuan penting:** kolom `AMOUNT` di Excel tidak membedakan pencadangan dan
> actual. Pembedaannya hanya ada di catatan tangan. Sistem harus memisahkan.

## 4. Weekly report — sheet `DOM` / `EXIM`

| Kolom | Field sistem | Catatan |
|---|---|---|
| `NO SO` | `job.job_no` | |
| `CUSTOMER` | `job.customer_id` | ⚠️ 3 varian nama Materee |
| `SELLING` | dihitung dari charge line | jangan diimpor sebagai nilai |
| `COST` | dihitung dari charge line | idem |
| `GP` | dihitung | ⚠️ `DOM!Q91` salah 10.200.000 |
| `%` | dihitung | |
| `STATUS` | `job.status` | ⚠️ nilai bebas, perlu dipetakan |
| `TGL CETAK INVOICE` | `customer_invoice.issue_date` | |
| `TGL KIRIM INVOICE` | `customer_invoice.sent_date` | ⚠️ rumus tidak konsisten |
| `TOP` | `customer_invoice.top_days` | |
| `TGL JATUH TEMPO` | `customer_invoice.due_date` | ⚠️ 3 rumus berbeda, Q07 |
| `TGL PEMBAYARAN` | `payment_in.paid_date` | |
| `NILAI PEMBAYARAN` | `payment_in.amount_idr` | |
| `KETERANGAN` | catatan | teks bebas, mis. "LATE 34 HARI" |

## 5. Invoice customer

| Label | Field | Catatan |
|---|---|---|
| `INVOICE NO` | `customer_invoice.invoice_no` | |
| `DATE` | `issue_date` | |
| `TOP` | `top_days` | "30 DAYS" → 30 |
| `DUE DATE` | `due_date` | |
| `JOB NO` | `job_id` | |
| `SUB TOTAL` | `sub_total_idr` | |
| `DPP` | `dpp_idr` | tanpa reimburse |
| `PPN 1,1%` | `ppn_idr` | |
| `PPH 23 2%` | `pph23_idr` | |
| `GRAND TOTAL` | `grand_total_idr` | |
| `TERBILANG` | `terbilang` | dibuat ulang oleh sistem |

## 6. Nilai enum yang ditemukan di data

### Status job (mentah, perlu dipetakan) ⚠️
```
SUDAH DIBAYAR | BELUM DIBAYAR | LATE 34 HARI | PROSES | -
```
> Ini campuran status pembayaran dan status operasional dalam satu kolom.
> Sistem memisahkan menjadi `job.status` dan `customer_invoice.status`.

### Suffix job
```
(EXP) | (IMP) | (AF) | (SEAFREIGHT) | tanpa suffix
```

### Kode sales
```
KIM | VIN | RIK | YUD
```
⚠️ Perlu dipetakan ke nama orang — Q17.

## 7. Aturan normalisasi importer

| Masalah | Penanganan |
|---|---|
| Nama customer bervariasi | Tabel pemetaan manual, **jangan** tebak dengan fuzzy match |
| `METTA LINTAS` vs `META LINTAS` | Konfirmasi Q25 sebelum digabung |
| Tanggal tahun 2006 | Tandai, jangan perbaiki otomatis |
| GP tidak sama dengan selling−cost | Tandai, impor apa adanya, laporkan |
| Sel kosong pada kolom wajib | Tandai baris, jangan isi default |
| Nomor job kembar antar scope | Sah, pisahkan pakai `seq_scope` |

> **Prinsip importer:** *import, tandai, laporkan* — jangan pernah *perbaiki
> diam-diam*. Data yang salah adalah bukti yang berharga untuk Pak Indra.
