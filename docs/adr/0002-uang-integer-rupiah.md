# ADR-0002: Uang Disimpan sebagai Integer Rupiah

- **Status:** Accepted
- **Tanggal:** 2026-08-13

## Konteks

Seluruh nilai dalam sistem ini adalah uang. Data asli menunjukkan pecahan
muncul dari perhitungan pajak:

```
DPP 132.623.041 × 1,1%  = 1.458.853,45
DPP 132.623.041 × 2%    = 2.652.460,82
Subtotal EXIM           = 16.410.566,15
```

Sementara itu invoice final selalu bilangan bulat rupiah. Ada satu kasus
selisih **Rp 1** antara hitungan kami (131.429.433) dan invoice asli
(131.429.434) — bukti bahwa urutan pembulatan berpengaruh nyata.

Rupiah tidak memakai sen dalam praktik bisnis ini.

## Keputusan

1. Semua nominal disimpan sebagai **`BIGINT` dalam satuan rupiah penuh**.
2. **Dilarang** memakai `FLOAT`, `DOUBLE`, `REAL`, atau `number` JavaScript
   untuk uang dalam bentuk apa pun.
3. Tarif pajak disimpan sebagai **basis poin integer**: `110` = 1,1%,
   `200` = 2%.
4. Semua aritmetika uang lewat helper di `src/domain/money/`. Dilarang
   operator `+ - * /` langsung pada nilai uang di luar folder itu.
5. Titik pembulatan **eksplisit dan tunggal** — lihat catatan di bawah.

```ts
// domain/money/money.ts
export type Rupiah = number & { readonly __brand: "Rupiah" }

export const rupiah = (n: number): Rupiah => {
  if (!Number.isInteger(n)) throw new Error(`Rupiah harus integer: ${n}`)
  return n as Rupiah
}

export const applyRateBp = (base: Rupiah, rateBp: number): Rupiah =>
  rupiah(Math.round((base * rateBp) / 10_000))
```

## Titik pembulatan 🔴

Aturan pembulatan yang benar **belum diketahui** (Q05). Sampai terjawab:

- Pembulatan hanya terjadi **satu kali per komponen pajak** (PPN, PPh 23),
  memakai `Math.round`, atas total DPP — bukan per baris.
- Golden test Diametral akan **gagal** dengan selisih Rp 1.
- **Kegagalan itu disengaja.** Jangan diakali dengan toleransi. Test merah
  adalah pengingat bahwa Q05 masih terbuka.

## Konsekuensi

**Positif:** tidak ada galat floating point, sama persis dengan cara klien
menulis angka, mudah diuji.

**Negatif:** butuh konversi di boundary API dan tampilan. Diterima.

**Penegakan:** lint rule kustom yang menolak `number` mentah pada field
berakhiran `_idr`, plus review skema pada setiap migrasi.
