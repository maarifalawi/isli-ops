---
name: isli-tax-rules
description: Aturan perpajakan Indonesia untuk jasa freight forwarding ISLI — PPN 1,1% atas DPP Nilai Lain, PPh 23 2%, dan perlakuan reimbursement. Gunakan skill ini setiap kali menghitung, menampilkan, atau menyimpan angka pajak pada invoice atau job.
---

# Aturan Pajak ISLI

## Kapan skill ini dipakai

Setiap kali kamu menyentuh: DPP, PPN, PPh 23, reimbursement, grand total
invoice, atau kolom pajak di charge line.

## Urutan perhitungan — jangan diubah

```
1. sub_total   = SUM(semua baris selling)
2. reimburse   = SUM(baris dengan is_at_cost = true)
3. dpp         = sub_total - reimburse
4. ppn         = round(dpp * 110 / 10_000)          // 1,1%
5. pph23       = pph23_applicable
                   ? round(dpp * 200 / 10_000)      // 2%
                   : 0
6. grand_total = sub_total + ppn - pph23
```

Diverifikasi terhadap dua invoice asli. Jangan tulis ulang dengan urutan lain.

## Kenapa 1,1% dan bukan 11%

Jasa freight forwarding di Indonesia memakai **DPP Nilai Lain** sebesar 10%
dari nilai tagihan. Sehingga PPN efektif = 11% × 10% = **1,1%**.

Di kode, simpan sebagai basis poin: `110`. Jangan pernah menulis `0.011`.

## Reimbursement dikeluarkan dari DPP

Biaya yang diteruskan **at cost** (tanpa margin) tidak termasuk penyerahan jasa
kena pajak, sehingga tidak masuk DPP.

Contoh nyata dari Invoice Materee:
```
FREIGHT JAKARTA-SAMARINDA   22.600.000   ← kena PPN
REIMBURSE INAP               1.000.000   ← TIDAK kena PPN
SUB TOTAL                   23.600.000
DPP                         22.600.000
PPN 1,1%                       248.600
GRAND TOTAL                 23.848.600
```

### Invariant at-cost
Untuk baris `is_at_cost = true`, nilai selling **harus sama persis** dengan
nilai buying. Kalau tidak sama, itu bukan reimbursement — itu jasa bermargin
dan kena PPN. Sistem wajib menolak.

## PPh 23 🔴 ATURANNYA BELUM DIKETAHUI

**Ini jebakan paling berbahaya di seluruh sistem.**

Dua invoice asli berperilaku berbeda:

| Customer | Segmen | PPh 23 |
|---|---|---|
| PT Materee Nusantara Utama | Domestik | **tidak dipotong** |
| PT Diametral Involute | EXIM | **dipotong 2%** |

**Tidak ada yang tahu kenapa.** Ini pertanyaan Q04 di `OPEN-QUESTIONS.md`.

### Aturan sementara — wajib diikuti

```ts
// ✅ BENAR — manual, default mati
pph23Applicable: z.boolean().default(false)

// ❌ SALAH — semua ini adalah tebakan
pph23Applicable: segment === "EXIM"
pph23Applicable: customer.isPkp
pph23Applicable: amount > 10_000_000
```

Field ini **diisi manual oleh Finance** setiap invoice sampai Q04 terjawab.
Merepotkan, tapi tidak pernah salah diam-diam.

## Pembulatan 🔴 BELUM PASTI

Invoice Diametral asli tertulis `131.429.434`.
Hitungan kami menghasilkan `131.429.433`. **Selisih Rp 1.**

```
132.623.041 + 1.458.853 - 2.652.461 = 131.429.433
```

Kemungkinan penyebab: pembulatan per komponen berbeda, atau pembulatan ke atas,
atau ada komponen yang belum terlihat.

**Sampai Q05 terjawab:** pakai `Math.round` sekali per komponen pajak atas total
DPP. Biarkan golden test Diametral merah. **Jangan tambah toleransi.**

## PPh 23 sisi vendor ⚠️

Job sheet punya kolom `PPH 23 - 2%` di tabel BUYING, artinya ISLI juga memotong
PPh 23 saat membayar vendor jasa. Semua sel kosong di sampel, jadi mekanismenya
belum jelas (Q14). Simpan field-nya, jangan otomatiskan.

## Nilai referensi — pakai ini di test

| Sumber | Nilai |
|---|---|
| Materee: sub total | 23.600.000 |
| Materee: reimburse | 1.000.000 |
| Materee: DPP | 22.600.000 |
| Materee: PPN 1,1% | 248.600 |
| Materee: grand total | 23.848.600 |
| Diametral: DPP | 132.623.041 |
| Diametral: PPN 1,1% | 1.458.853 |
| Diametral: PPh 23 2% | 2.652.461 |
| Diametral: grand total (asli) | 131.429.434 |

## Checklist sebelum menyatakan selesai

- [ ] Tidak ada `0.011` atau `0.02` di kode
- [ ] Semua nominal `BIGINT` rupiah
- [ ] Pembulatan hanya di satu titik per komponen
- [ ] `pph23_applicable` tidak ditebak dari data lain
- [ ] Angka pajak dibekukan di invoice saat issue
- [ ] `tax_rule_version` tersimpan di invoice
- [ ] Golden test Materee hijau
