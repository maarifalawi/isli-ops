---
name: isli-invoice-render
description: Struktur dan penomoran invoice ISLI, termasuk format nomor, blok pajak, terbilang bahasa Indonesia, dan invoice reimburse terpisah. Gunakan saat membuat atau mengubah template invoice atau logika penomorannya.
---

# Render Invoice ISLI

## Format nomor invoice

```
NNN-TIPE/JOB_NO/BULAN_ROMAWI/YYYY
```

Contoh nyata:
```
017-INVDOM/ISLI-26.06-012/VII/2026
004-INVEXP/ISLI-26.07-003(AF)/VII/2026
```

| Bagian | Aturan |
|---|---|
| `NNN` | urut invoice, **bukan** urut job. Counter terpisah per tipe. |
| `TIPE` | `INVDOM` domestik, `INVEXP` ekspor. 🔴 `INVIMP` belum ada sampelnya. |
| `JOB_NO` | nomor job lengkap **termasuk suffix** |
| `BULAN_ROMAWI` | bulan **terbit invoice**, bukan bulan job |
| `YYYY` | tahun terbit invoice |

> Perhatikan: job `ISLI-26.06-012` (Juni) terbit invoice bulan `VII` (Juli).
> Jangan ambil bulan dari nomor job.

```ts
const ROMAWI = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"]
```

## Struktur invoice

```
┌─ KOP SURAT ISLI (logo + identitas) ────────────────┐
│ 🔴 NPWP, alamat, telepon, email BELUM DIKETAHUI  │
└───────────────────────────────────────────┘

INVOICE
Invoice No : 017-INVDOM/ISLI-26.06-012/VII/2026
Date       : 14-Jul-26
TOP        : 30 DAYS
Due Date   : 13-Aug-26

To   : PT. MATEREE NUSANTARA UTAMA
NPWP : 634484505071000

Job No     : ISLI-26.06-012
Route      : JAKARTA - SAMARINDA

┌──────────────────────────────────────────┬────────────┐
│ DESCRIPTION                                  │     AMOUNT │
├──────────────────────────────────────────┼────────────┤
│ FREIGHT JAKARTA - SAMARINDA                  │ 22.600.000 │
│ REIMBURSE INAP                               │  1.000.000 │
├──────────────────────────────────────────┼────────────┤
│ SUB TOTAL                                    │ 23.600.000 │
│ DPP                                          │ 22.600.000 │
│ PPN 1,1%                                     │    248.600 │
│ PPH 23 2%                                    │          0 │
│ GRAND TOTAL                                  │ 23.848.600 │
└──────────────────────────────────────────┴────────────┘

TERBILANG : Dua Puluh Tiga Juta Delapan Ratus Empat Puluh
            Delapan Ribu Enam Ratus Rupiah

Pembayaran ditransfer ke:
Bank    : DANAMON
Cabang  : KCP HARAPAN INDAH - BEKASI
No. Acc : 003707391938
A/N     : PT. INTEGRA SINERGI LOGITAMA INDONESIA

                          PT. INTEGRA SINERGI LOGITAMA INDONESIA
                          [materai]
                          FINANCE
```

## Invoice Reimburse terpisah

Untuk job EXIM, baris at-cost keluar sebagai dokumen terpisah **tanpa PPN**:

```
INVOICE REIMBURSE
AT COST REIMBURSEMENT STORAGE    530.580
AT COST REIMBURSEMENT LIFT ON    651.946
TOTAL                          1.182.526
(tanpa PPN, tanpa PPh 23)
```

## Terbilang

Aturan bahasa Indonesia:
```
1        → "Satu"
11       → "Sebelas"
12       → "Dua Belas"
100      → "Seratus"          (bukan "Satu Ratus")
1.000    → "Seribu"           (bukan "Satu Ribu")
1.100    → "Seribu Seratus"
2.000    → "Dua Ribu"
1.000.000 → "Satu Juta"       ("Sejuta" tidak dipakai di invoice)
```

Selalu diakhiri kata `Rupiah`. Kapitalisasi setiap kata, mengikuti invoice asli.

Wajib ada test untuk: 0, 11, 100, 1000, 1100, 23.848.600, 131.429.434.

## Aturan render

1. **Angka dibaca dari kolom beku** di `customer_invoice`, tidak dihitung ulang
   saat render (ADR-0005)
2. Render **di server**, tidak pernah di browser
3. Terbilang **disimpan** di kolom, tidak dihasilkan saat render
4. Format angka Indonesia: titik sebagai pemisah ribuan
5. Format tanggal invoice: `14-Jul-26` (mengikuti dokumen asli)

## Prasyarat penerbitan

```
✓ Job berstatus FINAL
✓ Proof of Delivery sudah diterima
✓ Nomor invoice dialokasikan dengan row lock
```

Kutipan Pak Indra:
> "POD harus kembali ke Jakarta setelah barang clear di-delivery, baru dibikin
> invoice, baru dikasih ke customer."

## 🔴 Yang masih belum diketahui

| Hal | Pertanyaan |
|---|---|
| NPWP & alamat ISLI | Q20 — file kop surat isinya gambar tanpa teks |
| Pembulatan | Q05 — selisih Rp 1 di invoice Diametral |
| Kapan PPh 23 dipotong | Q04 |
| Basis hitung jatuh tempo | Q07 |
| Apakah ada INVIMP | Q12 |

## Checklist

- [ ] Nomor invoice sesuai format, bulan Romawi dari tanggal terbit
- [ ] Counter terpisah per tipe invoice
- [ ] DPP mengecualikan reimburse
- [ ] Terbilang benar dan tersimpan
- [ ] Invoice reimburse terpisah tanpa PPN
- [ ] Render di server
- [ ] Uji banding dengan 2 invoice asli di `docs/source-of-truth/`
