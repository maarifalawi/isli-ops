# ADR-0007: Definisi GP dan Perlakuan PPN

- **Status:** 🔴 **PROPOSED — BUTUH KONFIRMASI BU NIKEN & PAK INDRA**
- **Tanggal:** 2026-08-13
- **Blokir:** Slice 1 & Slice 4

## Konteks

Rumus di Excel klien (dari inspeksi formula, bukan dugaan):

```
GP   = E16 - D41
NETT = G16 - D41

E16 = total selling, TANPA baris reimburse
G16 = total selling + PPN 1,1%
D41 = total buying, TERMASUK baris at-cost
```

### Masalah 1 — PPN dihitung sebagai margin

`NETT = (selling + PPN) − cost`

PPN adalah **uang negara** yang dititipkan ke ISLI. Memasukkannya ke margin
berarti melaporkan laba yang sebenarnya utang pajak.

Contoh nyata `ISLI-26.08-005`:
```
GP   3.465.000 (9,12%)
NETT 3.883.000 (10,11%)
selisih 418.000 = persis nilai PPN 1,1%
```
Seluruh selisih GP dan NETT adalah PPN. Tidak ada komponen lain.

### Masalah 2 — Asimetri reimburse

Job `ISLI-26.08-005`:
```
Sisi selling: CHARGE LOLO 645.000  → TIDAK masuk pembilang GP
Sisi buying : THC LOLO JKT 4.805.000 → masuk penuh ke penyebut
```

Pendapatan reimburse dikeluarkan, tapi biayanya dimasukkan. GP jadi understated.

### Masalah 3 — Penyebut persentase tidak konsisten

Ada job yang `%` dihitung terhadap selling, ada yang terhadap total termasuk
pajak. Persentase antar job tidak bisa dibandingkan.

## Keputusan yang diusulkan

```ts
// domain/costing/gp.ts
selling_total = SUM(charge_line WHERE side = 'SELLING')   // TERMASUK reimburse
buying_total  = SUM(charge_line WHERE side = 'BUYING')    // TERMASUK at-cost

gp     = selling_total - buying_total
gp_pct = gp / selling_total

// PPN TIDAK PERNAH masuk perhitungan margin.
// Istilah "NETT" DIHAPUS dari sistem.
```

### Kenapa reimburse dimasukkan di kedua sisi

Karena nilainya identik (R4.3), memasukkannya di kedua sisi menambah nol pada
`gp` tetapi menaikkan penyebut. Hasilnya `gp_pct` sedikit lebih rendah namun
**konsisten dan bisa dibandingkan antar job**. Ini lebih jujur daripada rumus
sekarang yang mengeluarkan pendapatan tapi memasukkan biaya.

Alternatif yang juga sah: keluarkan reimburse dari **kedua** sisi. Yang
dilarang adalah mengeluarkan hanya dari satu sisi — seperti sekarang.

## Dampak angka

GP hasil sistem akan **berbeda** dari Excel pada hampir semua job:

| Sebab | Arah |
|---|---|
| PPN dikeluarkan dari margin | GP turun ≈ 1,1% dari selling |
| Reimburse simetris | GP naik pada job yang punya baris at-cost |
| Persentase konsisten | naik/turun tergantung job |

**Ini harus dikomunikasikan sebelum go-live.** Kalau tidak, Pak Indra akan
melihat angka berubah dan menyimpulkan sistem baru salah.

Cara membawakannya:
> "Pak, GP di sistem akan sedikit beda dengan Excel. Bukan karena sistemnya
> salah, tapi karena Excel selama ini menghitung PPN sebagai keuntungan.
> PPN itu uang pajak yang harus disetor, bukan laba Bapak. Angka baru ini lebih
> kecil, tapi ini angka yang sebenarnya."

## Pertanyaan yang harus dijawab dulu

1. Apakah rumus NETT memang disengaja, atau kekeliruan lama? (Q09)
2. Bila disengaja, apa gunanya bagi Bu Niken?
3. Setuju istilah NETT dihapus dan diganti satu definisi GP?
4. Reimburse: masuk kedua sisi, atau keluar dari kedua sisi?

## Keputusan

> **BELUM DIPUTUSKAN.**
> Agent: `domain/costing/gp.ts` tidak boleh ditulis sebelum baris ini diisi.
