---
description: Aturan menulis kode yang menyentuh uang, pajak, atau GP.
globs: ["src/domain/money/**", "src/domain/tax/**", "src/domain/costing/**", "src/services/**", "tests/golden/**"]
---

# Uang & Pajak — Zona Paling Berbahaya

File yang cocok dengan glob di atas mengatur uang orang lain.
Standar di sini lebih tinggi daripada bagian lain repo.

## Aturan mutlak

### 1. Tipe
```ts
// ✅ BENAR
const amount: Rupiah = rupiah(9_282_000)
const ppn: Rupiah = applyRateBp(dpp, 110)   // 110 bp = 1,1%

// ❌ SALAH
const amount = 9282000.50
const ppn = dpp * 0.011
```

### 2. Tarif sebagai basis poin integer
```ts
const PPN_RATE_BP = 110    // 1,1%
const PPH23_RATE_BP = 200  // 2%

applyRateBp(base, bp) => Math.round(base * bp / 10_000)
```
Jangan pernah menulis `0.011` atau `0.02` di mana pun.

### 3. Pembulatan satu kali, eksplisit
```ts
// ✅ bulatkan sekali di titik yang ditentukan
const ppn = applyRateBp(dppTotal, PPN_RATE_BP)

// ❌ jangan bulatkan per baris lalu jumlahkan
const ppn = lines.reduce((s, l) => s + Math.round(l.amount * 0.011), 0)
```
> ✅ Q05 DIJAWAB 13 Agu 2026: bulatkan KE ATAS (ceiling), bukan ke terdekat.
> Pakai `Math.ceil` (atau `CEIL` di SQL) pada setiap nilai rupiah pecahan --
> BUKAN `round()`. Golden test Diametral seharusnya HIJAU sekarang, bukan
> sengaja merah Rp 1 lagi. Kalau masih meleset, itu bug pembulatan -- telusuri,
> jangan diakali.

### 4. Urutan perhitungan invoice — hafalkan
```
1. sub_total   = SUM(semua baris selling)
2. reimburse   = SUM(baris is_at_cost)
3. dpp         = sub_total - reimburse          ← R3.2
4. ppn         = ceil(dpp * 110 / 10000)        ← R3.1, R3.6 (ceiling, Q05)
5. pph23       = pph23_applicable
                   ? ceil(dpp * 200 / 10000)
                   : 0                          ← R3.5, default MATI
6. grand_total = sub_total + ppn - pph23        ← R3.3
```
Urutan ini **tidak boleh diubah**. Diverifikasi terhadap 2 invoice asli.

### 5. PPh 23 default MATI
```ts
// ✅ BENAR
pph23Applicable: z.boolean().default(false)

// ❌ SALAH — ini menebak aturan yang belum diketahui
pph23Applicable: customer.isPkp
pph23Applicable: segment === "EXIM"
```
Aturannya belum diketahui (Q04). Field ini **diisi manual oleh Finance**
sampai ada jawaban resmi.

### 6. GP tidak pernah menyertakan PPN
```ts
// ✅ BENAR
const gp = sellingTotal - buyingTotal

// ❌ SALAH — ini rumus NETT yang keliru di Excel klien
const nett = (sellingTotal + ppn) - buyingTotal
```

### 7. Konversi mata uang pakai kurs job
```ts
// ✅ BENAR
const idr = rupiah(Math.round(usd * job.fxRateUsdIdr))

// ❌ SALAH — kurs berbeda antar job (18.300 vs 18.200)
const idr = usd * GLOBAL_RATE
```

## Wajib ada test

Setiap fungsi di zona ini butuh minimal:

1. **Test nilai nyata** memakai angka dari dokumen asli
2. **Test batas**: nol, satu rupiah, nilai sangat besar
3. **Test pembulatan**: nilai yang menghasilkan pecahan
4. **Test negatif**: input tidak valid harus melempar error, bukan mengembalikan
   nilai diam-diam

Contoh yang wajib lulus:
```ts
it("invoice Materee domestik", () => {
  expect(hitungInvoice({
    lines: [
      { amount: 22_600_000, isAtCost: false },
      { amount:  1_000_000, isAtCost: true  },  // REIMBURSE INAP
    ],
    pph23Applicable: false,
  })).toEqual({
    subTotal:   23_600_000,
    reimburse:   1_000_000,
    dpp:        22_600_000,
    ppn:           248_600,
    pph23:               0,
    grandTotal: 23_848_600,
  })
})
```

## Nilai referensi dari dokumen asli

Hafalkan atau salin dari sini, jangan hitung sendiri:

| Sumber | Nilai |
|---|---|
| Materee DPP | 22.600.000 |
| Materee PPN 1,1% | 248.600 |
| Diametral DPP | 132.623.041 |
| Diametral PPN 1,1% | 1.458.853 |
| Diametral PPh 23 2% | 2.652.461 |
| Diametral grand total (invoice asli) | 131.429.434 |
| USD 510 × 18.300 | 9.333.000 |
| USD 510 × 18.200 | 9.282.000 |
