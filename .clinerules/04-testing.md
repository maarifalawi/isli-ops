---
description: Standar test, termasuk golden test terhadap data asli klien yang sudah terverifikasi.
globs: ["**/*.test.ts", "tests/**"]
---

# Testing

## Filosofi

Sistem ini menggantikan Excel yang dikelola manual bertahun-tahun. Satu-satunya
cara membuktikan sistem baru benar adalah menjalankan **data nyata** melewatinya
dan membandingkan hasilnya.

**Status data: ASLI dan TERVERIFIKASI** (Q37 dijawab 13 Agu 2026 — tidak ada
baris yang dihapus). Lihat `docs/SOURCE-PROVENANCE.md`.

Batasan yang tetap berlaku: ini **contoh** Apr–Jul 2026, bukan seluruh job ISLI.

## Piramida

| Tingkat | Alat | Cakupan | Target |
|---|---|---|---|
| Unit | Vitest | `src/domain/**` | ≥ 80% |
| **Golden A — struktural** | Vitest | format, penomoran, aturan pajak | **100% wajib hijau** |
| **Golden B — rekonsiliasi** | Vitest | total GP per bulan/segmen | ✅ **AKTIF** |
| Integrasi | Vitest + Postgres | service, transaksi, constraint | jalur utama |
| Authz | Vitest | setiap `✗` di RBAC.md | 100% |
| E2E | Playwright | alur kritikal | 5 skenario |

---

## Golden A — Struktural

```
tests/golden/struktural/
  job-numbering.test.ts        # format + 16 tabrakan lintas scope
  job-sequence.test.ts         # 3 counter paralel, konkurensi
  invoice-numbering.test.ts    # format + bulan Romawi dari tanggal terbit
  tax-order.test.ts            # sub total → DPP → PPN → PPh 23
  invoice-materee.test.ts      # target 23.848.600
  invoice-diametral.test.ts    # target 131.429.434
  charge-codes.test.ts         # 43 kode termuat, kategori valid
  leg-combination.test.ts      # 1+3 tanpa 2 ditolak
  at-cost-symmetry.test.ts     # selling harus sama dengan buying
  fx-per-job.test.ts           # kurs dibaca per job, bukan global
```

### Catatan sejarah -- kegagalan yang DULU disengaja, sekarang tidak lagi

`invoice-diametral.test.ts` DULU dibiarkan merah dengan selisih Rp 1 karena
aturan pembulatan belum diketahui. **Q05 SUDAH DIJAWAB 13 Agu 2026: bulatkan ke
ATAS (ceiling).** Test ini seharusnya HIJAU sekarang. Kalau masih merah dengan
selisih Rp 1, itu BUG pembulatan di kode kita (kemungkinan besar masih pakai
`round()` bukan `ceil()`) -- **jangan diperbaiki dengan mengakali kode**, bukan
`toBeCloseTo`, bukan epsilon, bukan `it.skip`. Telusuri dan perbaiki fungsi
pembulatannya.

---

## Golden B — Rekonsiliasi ✅ AKTIF

Q37 sudah dijawab. Angka pembanding sah.

```
tests/golden/rekonsiliasi/
  gp-per-bulan.test.ts
  gp-per-segmen.test.ts
  total-apr-jul.test.ts
  bug-excel-terdeteksi.test.ts   ← lihat di bawah
```

Angka pembanding terverifikasi:

```ts
export const GOLDEN_APR_JUL_2026 = {
  selling: 2_063_427_693n,
  cost:    1_783_277_693n,
  gpBenar:   280_150_000n,   // selling - cost
  gpExcel:   257_650_000n,   // yang dilaporkan Excel klien
  selisih:    22_500_000n,   // bug F19 -> EXIM!Q39
} as const
```

### Test yang membuktikan sistem MENANGKAP bug Excel

Ini bukan test biasa. Sistem harus menghasilkan **280.150.000**, bukan meniru
angka Excel.

```ts
it("GP Juni tidak boleh sama dengan angka Excel yang salah", () => {
  const gp = hitungGpBulan({ tahun: 2026, bulan: 6, segmen: "EXPORT" })
  expect(gp).toBe(23_500_000n)      // benar
  expect(gp).not.toBe(1_000_000n)   // angka salah di Excel
})

it("GP hanya dihitung dari satu rumus", () => {
  // Akar masalah Excel: kolom F pakai 2 gaya (=D-E dan =Sheet!Q##).
  // Sistem hanya boleh punya SATU jalur perhitungan GP.
  expect(hitungGp(job)).toBe(job.selling - job.cost)
})
```

> **Dilarang menyesuaikan angka pembanding supaya hijau.** Kalau tidak cocok,
> itu informasi — bukan gangguan. Baca `.clinerules/workflows/verify-golden.md`.

---

## Test authz

Setiap sel `✗` di `docs/RBAC.md` wajib punya test:

```ts
describe("RBAC: approval final", () => {
  it.each(["FIN_MGR", "OPS_MGR", "OPS", "AP", "SALES", "VIEWER"])(
    "%s tidak boleh approve final",
    (role) => {
      expect(() => assertCan(userWith(role), "job.approve_final"))
        .toThrow(ForbiddenError)
    },
  )
})
```

## Test kasus nyata yang wajib ada

| Kasus | Test | Asal |
|---|---|---|
| Dobel bayar 01A/01B | Insert kedua dengan nomor vendor sama gagal di level DB | Bu Niken |
| Tabrakan nomor job | `ISLI-26.05-001` DOM & EXP hidup bersamaan | 16 kasus nyata |
| Konkurensi nomor | 50 request paralel → 0 duplikat | — |
| Unlock reset approval | `cycle` naik, approval lama gugur | Pak Indra |
| At-cost simetris | Selling ≠ buying pada baris at-cost ditolak | invoice |
| Leg 1+3 tanpa 2 | Ditolak | Pak Indra |
| Job FINAL | Semua percobaan edit ditolak | Pak Indra |
| Invoice sebelum POD | Ditolak | Pak Indra |
| ETD tidak masuk akal | Tahun di luar rentang wajar ditolak | ETD 2006 |
| **Subtotal tidak boleh parsial** | Subtotal wajib mencakup **semua** baris anaknya | `Q91=SUM(Q76:Q81)` |
| **Total wajib rekonsiliasi** | `total_gp` harus sama dengan `total_selling − total_cost`, selalu | `J13`, `F37` |

> Dua test terakhir lahir dari **bug tidur** di Excel klien: rentang SUM yang
> terpotong dan tidak ketahuan karena baris terkait kebetulan kosong. Sistem
> harus menolak keadaan itu, bukan menampilkannya diam-diam.

## Yang TIDAK perlu dites

- Styling / tampilan visual
- Library pihak ketiga
- Getter/setter sederhana
- Konfigurasi framework

Jangan mengejar coverage dengan test kosong. Coverage tinggi di `src/domain/`
bermakna; di komponen UI tidak.
