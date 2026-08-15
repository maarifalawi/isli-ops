# HANDOFF IRISAN 3 — CRUD — SESI D (update: pasca-sesi charge-codes)

> **STATUS TERKINI SESI D** — semua enam entitas CRUD sudah SELESAI:
> - [x] §10.2 ports/ship-lines (commit SESI C: 8008e36)
> - [x] §10.3 vendors/customers (commit SESI C: 8008e36, file 0d4e3a7)
> - [x] §10.4 charge-codes (commit SESI D: dff866e)
> - [ ] §10.1 /master/page.tsx hub — SATU-SATUNYA yang tersisa, biasanya kecil;
>   kerjakan TERAKHIR.

## Commit & Gate Hijau (charge-codes)
- Commit: `dff866e` — feat(master): CRUD UI charge-codes /master/charge-codes
  (kode immutable, kategori FIXED eksplisit). 4 files, +607.
- `pnpm tsc --noEmit` → EXIT_CODE=0 (no errors).
- `pnpm vitest run` → Test Files 15 passed (15) | Tests 163 passed (163),
  EXIT_CODE=0.
- `pnpm biome check` → EXIT_CODE=0, "Checked 65 files ... Found 8 warnings."
  (semua warnings pre-existing di scripts/: noConsole, noNonNullAssertion,
  noParameterAssign, noExplicitAny — BUKAN dari kode sesi ini).
- Catatan toolchain: pnpm 9.12.0 di-install global via `npm i -g pnpm@9.12`
  di mesin ini (sebelumnya belum ada); pnpm-lock.yaml tidak berubah.
- `git status` pasca-commit: working tree bersih.

## Yang dikerjakan SESI D (charge-codes, §10.4)

### 1. `buatChargeCode()` baru di `src/lib/master-data/index.ts` (+64 baris)
- Sebelumnya HANYA ada `ubahChargeCode()`; CREATE baru ditambahkan.
- Normalisasi kode: `teks(input.kode)?.toUpperCase()`.
- Validasi: keterangan wajib; `category` bila diisi harus ada di
  `CHARGE_CATEGORIES`; `segmentScope` bila diisi harus DOM|EXIM|BOTH;
  `defaultLeg` bila diisi harus 1|2|3.
- Duplikat PK ditolak: `select ... where eq(kode)` lalu `Kode "X" sudah dipakai.`
- Default: kategori "OPSIONAL", segmentScope "BOTH", isTaxable true,
  butuhVendor true, boolean lain false.
- Audit: aksi "CREATE", entitas "CHARGE_CODE", entitasId null (PK TEXT),
  sesudah = baris returning, alasan `CREATE kode <kode>`.

### 2. `actionBuatChargeCode()` di `src/lib/actions/master.ts`
- Membaca field FormData PERSIS kolom schema chargeCodes: kode, keterangan,
  nameId, category, defaultLeg (`angka()`), segmentScope (`"BOTH"` fallback),
  defaultReimburse, isAtCostDefault, isTaxable, pph23Applicable, butuhVendor
  (`bool()`).
- `kategori`: `bool(fd.get("kategoriFixed")) ? "FIXED" : "OPSIONAL"` —
  checkbox eksplisit; TANPA centang → otomatis OPSIONAL.
- `revalidatePath("/master/charge-codes")` bila ok.

### 3. `src/app/master/charge-codes/page.tsx` + `form.tsx` (pola SESI C)
- page.tsx server component: `requireUser()`, `daftarChargeCode(db)`,
  `export const dynamic = "force-dynamic"`, searchParams `?edit=<kode>` /
  `?nonaktif=<kode>` dicocokkan via `c.kode` (PK TEXT).
- form.tsx client component, semua action dibungkus `useActionState`;
  sukses → `router.push("/master/charge-codes")` + `router.refresh()`.
- Keistimewaan WAJIB yang ditegakkan:
  1. **kode immutable**: pada FormUbahChargeCode input kode `disabled`
     (tanpa atribut name, tidak ikut submit); kode dikirim lewat
     `<input type="hidden" name="kode">` karena `actionUbahChargeCode`
     lookup via `fd.get("kode")`. Server tetap menolak perubahan kode
     (ubahChargeCode: "Kode biaya tidak dapat diubah.").
  2. **segmentScope**: `<select>` DOM|EXIM|BOTH di kedua form (buat default
     BOTH; ubah defaultValue=baris).
  3. **kategori FIXED|OPSIONAL**: default OPSIONAL untuk kode baru.
     FormBuat memakai checkbox `kategoriFixed` TANPA defaultChecked
     ("Tandai sebagai kategori FIXED (eksplisit; tanpa centang = OPSIONAL)").
     FormUbah menampilkan checkbox sama dengan `defaultChecked={kategori === "FIXED"}`.
     Tidak ada jalan menandai FIXED tanpa sadar.
  4. **butuhVendor**: checkbox biasa di kedua form.
  5. **status**: Nonaktifkan via `?nonaktif=` → FormNonaktifChargeCode
     (hidden id=kode, aktifBaru="false", alasan required minLength 3 —
     ubahStatusAktif menolak tanpa alasan); Aktifkan = tombol inline
     FormAktifkanChargeCode (aktifBaru="true"). Keduanya memanggil
     `actionStatusChargeCode` (nama PERSIS; actionUbahStatusChargeCode
     tidak ada). `ubahStatusAktif("CHARGE_CODE", id, ...)` menerima `kode`
     sebagai id (PK TEXT; entitas_id audit tetap null).

### 4. Kolom yang TIDAK dirender di form UI (ada di schema chargeCodes tapi
sengaja tidak di-expose karena bukan bagian dari 6 butir WAJIB prompt):
`chargeLevel`, `chargeDirection`, `appliesTo`, `rateCurrency`, `ratePer`,
`rateMin`, `calcMode`, `calcMethod`, `calcParam`, `calcBasis`, `calcRounding`,
`rateStep`, `calcTable`, `basisQty`, `minChargeBasis`, `calcScope`,
`calcTier`, `prorationRule`, `prorationDetail`, `includeInSummary`,
`defaultGroup`, `defaultSort`, `invoiceLayout`, `showRateToCustomer`.
Bila sesi berikutnya butuh, polanya: tambah field di form + baca
FormData di actionUbahChargeCode (server sudah menerima field-field itu
lewat ChargeCodeInput).

## Yang dikerjakan SESI C (vendors/customers, §10.3)
1. `ubahStatusAktif()` di `src/lib/master-data/index.ts` — soft delete:
   set `aktif=false` + `alasanNonaktif` (WAJIB, non-blank) pada VENDOR /
   CUSTOMER / SHIP_LINE / PORT; entitas lain menolak
   ("...belum didukung — gunakan ubah untuk edit."). Reaktivasi:
   `aktif=true` + `alasanNonaktif=null`. Entitas dengan FK unik
   (vendor/customer) DITOLAK nonaktif bila masih dirujuk di jobs /
   job_items / vendor_payments / receipt_payments ("...masih dirujuk...").
   Audit aksi UPDATE (entitas_id = baris.id) dan DELETE.
2. `actionStatusVendor` / `actionStatusCustomer` di
   `src/lib/actions/master.ts` — baca `id`, `aktifBaru`, `alasan`;
   revalidatePath halaman terkait.
3. `src/app/master/vendors/form.tsx` + `customers/form.tsx`:
   FormBuat / FormUbah / FormNonaktif (reason wajib, `aktifBaru="false"`
   hidden) / FormAktifkan (aksi inline, `aktifBaru="true"`).
4. `page.tsx` vendors & customers: searchParams
   `?edit=<id>` / `?nonaktif=<id>`; tombol "Nonaktifkan" (merah) untuk
   aktif, tombol "Aktifkan" untuk nonaktif.

## Yang dikerjakan SEBELUMNYA (SESI C awal, ports/ship-lines, §10.2)
- FormBuat/FormUbah ports & ship-lines di `src/app/master/{ports,ship-lines}/form.tsx`
  (pola sama: useActionState + router.push/refresh, TombolPill, Batal).
- `page.tsx` ports & ship-lines: searchParams `?edit=<id>`;
  `sedangEdit = daftar.find(x => x.id === Number(edit))`.

## Catatan teknis untuk sesi berikutnya

### Pola form yang harus ditiru
- Semua form client component: `useActionState` membungkus server action;
  sukses → `router.push("/master/<entitas>")` + `router.refresh()`; hasil
  gagal dirender via `PesanHasil`.
- Field: primitives `Field`, `kelasInput`, `kelasTombolSekunder`, `TombolPill`,
  `PesanHasil`, `BadgeStatus`, `HalamanJudul` (semua dari
  `src/components/master/primitives.tsx`).
- FormNonaktif: hidden `id` + `aktifBaru="false"` + input `alasan` required.
- FormAktifkan: form kecil inline POST `id` + `aktifBaru="true"`.
- Link: `href={`/master/<entitas>?edit=${encodeURIComponent(x.id)}`}`.

### Nama fungsi / kolom PERSIS (jangan tebak)
- Master-data: `daftarChargeCode(db)`, `buatChargeCode(db, user, input)`,
  `ubahChargeCode(db, user, input)`, `ubahStatusAktif(db, user, entitas, id, {aktif, alasan})`,
  `CHARGE_CATEGORIES`, `SEGMENT_SCOPES`.
- Server actions (`src/lib/actions/master.ts`): `actionBuatChargeCode`,
  `actionUbahChargeCode` (FormData field: kode + keterangan, nameId,
  category, defaultLeg, segmentScope, kategoriFixed, defaultReimburse,
  isAtCostDefault, isTaxable, pph23Applicable, butuhVendor),
  `actionStatusChargeCode` (FormData: id=kode, aktifBaru, alasan).
  `actionUbahStatusChargeCode` TIDAK ADA — namanya actionStatusChargeCode.
- Charge codes lookup pakai KODE (bukan id): page.tsx cocokkan `c.kode === edit`.

### Gate wajib sebelum commit (semua harus hijau)
1. `pnpm tsc --noEmit` (mesin ini: pnpm 9.12.0)
2. `pnpm vitest run`
3. `pnpm biome check` (abaikan warnings pre-existing scripts/, asal 0 errors)

## Sisa Irisan 3 — SESI BERIKUTNYA (terakhir, biasanya kecil)
1. **§10.1 /master/page.tsx (hub)** — grid/link ke 5 halaman master
   (ports, ship-lines, vendors, customers, charge-codes). Cek dulu apakah
   `src/app/master/layout.tsx` atau `src/app/layout.tsx` sudah ada nav
   /master; bila ada, cukup hub sederhana.

## Lampiran hasil gate literal SESI D
- `pnpm tsc --noEmit` → `TSC_EXIT=0` (tanpa output error).
- `pnpm vitest run`:
  ```
   ✓ tests/unit/money.property.test.ts (29 tests) 380ms
   ✓ tests/unit/job-number-romawi.test.ts (10 tests) 443ms
   ✓ tests/unit/tax.test.ts (19 tests) 453ms
   ✓ tests/unit/similarity.test.ts (14 tests) 483ms
   ✓ tests/unit/terbilang.test.ts (17 tests) 520ms
   ✓ tests/unit/money.test.ts (23 tests) 523ms
   ✓ tests/unit/costing.test.ts (18 tests) 532ms
   ✓ tests/integration/job-sequence.integration.test.ts (4 tests) 575ms
   ✓ tests/unit/audit.test.ts (7 tests) 548ms
   ✓ tests/golden/invoice-tax.golden.test.ts (8 tests) 1151ms
   ✓ tests/golden/summary-2026.golden.test.ts (2 tests) 1173ms
   ✓ tests/golden/job-costing.golden.test.ts (5 tests) 1200ms
   ✓ tests/integration/master-data.integration.test.ts (3 tests) 1251ms
   ✓ tests/e2e/smoke.spec.ts (2 tests) 1803ms
   ✓ tests/e2e/auth.spec.ts (2 tests) 4590ms

   Test Files  15 passed (15)
        Tests  163 passed (163)
  ```
  `VITEST_EXIT=0`
- `pnpm biome check .` → `Checked 65 files in 27ms. No fixes applied.` /
  `Found 8 warnings.` / `BIOME_EXIT=0` (semua warnings pre-existing di
  scripts/seed.ts, scripts/check-seed.ts, scripts/backfill-sequence-counters.ts,
  scripts/check-sequence.ts).
