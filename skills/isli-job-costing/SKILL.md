---
name: isli-job-costing
description: Model costing job freight forwarding ISLI — charge line, sisi selling vs buying, pencadangan vs actual, dan perhitungan GP. Gunakan skill ini saat membuat atau mengubah struktur biaya job.
---

# Job Costing ISLI

## Kesalahan model yang paling mudah terjadi

Pak Indra menjelaskan bisnisnya sebagai tiga segmen biaya:

> "Nomor satu warehouse ke port asal itu trucking. Nomor dua port asal ke port
> tujuan, sea freight atau air freight. Nomor tiga port tujuan ke final
> delivery."

**Jangan modelkan seperti itu.**

```ts
// ❌ SALAH — langsung gagal di job pertama
interface Job {
  costTrucking: number
  costFreight: number
  costDelivery: number
}
```

Job sheet asli punya **14–24 baris biaya** dari **≈40 charge code** berbeda,
masing-masing dengan vendor sendiri, nomor invoice sendiri, dan status pajak
sendiri.

Contoh satu job nyata (`ISLI-26.07-004`, satu kontainer Jakarta–Batam):
```
OF ICON               3.500.000
BL                      200.000
THC                   2.402.500
LSS                   2.550.000
THD                   1.300.000
ADD FREIGHT             140.000
DOORING DANISH        1.930.000
TRUCKING SMT          2.600.000
UM SUPIR SMT            150.000
HANDLING OPS FREELANCE  100.000
SEGEL                   100.000
MATERAI                  10.000
MATERAI                  19.000
DELIVERY CHARGE TIKI      7.000
```
14 baris, 6 vendor berbeda. Tiga kolom tidak akan cukup.

## Model yang benar

```ts
// ✅ BENAR
interface ChargeLine {
  jobId: string
  side: "SELLING" | "BUYING"
  chargeCodeId: string
  description: string
  leg?: 1 | 2 | 3            // opsional, untuk laporan tiga-segmen
  currency: "IDR" | "USD"
  amountOriginal: Rupiah
  amountIdr: Rupiah
  isAtCost: boolean
  vendorId?: string          // wajib untuk BUYING
  pencadanganIdr?: Rupiah
  actualIdr?: Rupiah
}
```

`leg` tetap ada sebagai atribut sehingga laporan tiga-segmen ala Pak Indra
masih bisa dibuat lewat agregasi — tanpa mengorbankan detail.

## Kombinasi leg yang sah

```
✓ 1        hanya trucking
✓ 2        hanya freight
✓ 3        hanya delivery
✓ 1+2      trucking + freight
✓ 2+3      freight + delivery
✓ 1+2+3    door to door
✗ 1+3      TIDAK MUNGKIN — "Satu tiga nggak mungkin"
```

Ditegakkan lewat CHECK constraint di database, bukan hanya validasi form.

## Pencadangan vs Actual

Konsep ini **tidak pernah disebut** dalam pembicaraan lisan. Ditemukan di
catatan tangan meeting.

```
Deskripsi          Pencadangan    Actual      Selisih
DOORING             2.000.000   1.930.000      70.000
LSS                 3.500.000   4.000.000    -500.000
THD                 1.250.000   1.300.000     -50.000
TRUCKING            3.200.000   3.000.000     200.000
```

Alur:
1. Job dibuat → semua baris buying diisi `pencadangan`
2. Invoice vendor datang → diverifikasi → `actual` terisi
3. `selisih` dihitung otomatis (generated column)
4. Invoice vendor dibayar → baris terkunci

## 🔴 Pemindahan biaya antar job — JANGAN IMPLEMENTASIKAN

Catatan meeting menunjukkan praktik ini:
```
TRUCKING (ADD COST) 1.300.000
  → DIPECAH KE 07-014  300.000
  → DIPECAH KE 07-016  300.000
  alasan: "KARENA GP 7,27%"
```

Biaya dipindahkan antar job dengan alasan yang menyebut persentase GP.

**Ini keputusan bisnis yang belum diambil.** Lihat ADR-0006.
Selama ADR itu masih `Proposed`, **dilarang** mengimplementasikan pemindahan
biaya dalam bentuk apa pun — termasuk "sementara pakai kolom catatan dulu".

## Perhitungan GP

```ts
sellingTotal = sum(lines.filter(l => l.side === "SELLING").map(l => l.amountIdr))
buyingTotal  = sum(lines.filter(l => l.side === "BUYING").map(l => l.amountIdr))

gp     = sellingTotal - buyingTotal
gpPct  = gp / sellingTotal
```

**PPN tidak pernah masuk.** Istilah "NETT" dari Excel klien dihapus dari sistem.

> 🔴 Definisi final masih menunggu ADR-0007. Jangan tulis `domain/costing/gp.ts`
> sebelum ADR itu `Accepted`.

## Kurs mata uang

Kurs disimpan **per job**, bukan global. Dua job EXIM di bulan yang sama memakai
kurs berbeda: `18.300` dan `18.200`.

```ts
// ✅ BENAR
const idr = rupiah(Math.round(usd * job.fxRateUsdIdr))

// ❌ SALAH
const idr = usd * KURS_GLOBAL
```

## Invariant yang wajib ditegakkan

| ID | Aturan |
|---|---|
| C1 | Baris BUYING wajib punya `vendor_id` |
| C2 | Baris SELLING tidak boleh punya `vendor_id` |
| C3 | Baris `is_at_cost` → selling harus sama dengan buying |
| C4 | Kombinasi leg `1+3` tanpa `2` ditolak |
| C5 | Charge code harus ada di master, tidak boleh teks bebas |
| C6 | Job FINAL menolak semua perubahan charge line |
| C7 | Charge line yang invoice vendornya sudah PAID terkunci |

## Checklist

- [ ] Tidak ada kolom `cost1/cost2/cost3` di skema
- [ ] Semua nominal `BIGINT`
- [ ] Kurs dibaca dari job, bukan konstanta
- [ ] Pencadangan dan actual terpisah
- [ ] Tidak ada logika pemindahan biaya antar job
- [ ] Golden test 75 job hijau
