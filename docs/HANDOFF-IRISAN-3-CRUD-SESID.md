# HANDOFF IRISAN 3 CRUD — SESI D (STATUS AKURAT, DITIMPA)

> File ini DITIMPA di sesi D. Versi sebelumnya berisi laporan SESI C yang
> hanya di-rename — jangan percaya isi lama itu.

## Status sesi D (jujur)

**BELUM ADA satu pun halaman /master/\* yang dibangun/commit di sesi D.**
Sesi D (percobaan pertama) habis konteks sebelum menulis file apa pun;
sesi D (percobaan kedua) hanya sempat: verifikasi keadaan, membaca ulang
semua kontrak, lalu berhenti lagi karena konteks penuh sebelum halaman
pertama ditulis. Tidak ada gate (tsc/vitest/biome) yang dijalankan untuk
halaman apa pun — karena memang belum ada halaman.

## Fakta yang TERVERIFIKASI di sesi D (boleh dipakai sesi E)

1. **Tidak ada draft rusak**: `src/app/master/` TIDAK ADA di tree (dicek
   dengan Get-ChildItem). Tidak ada sisa impor `./actions` yang salah.
2. **HEAD git**: `def09de feat(actions): server actions master data ...`
   (SS4). Di working tree ada: rename ter-staged
   `HANDOFF-IRISAN-3-CRUD-SESIC.md -> ...SESID.md` dan perubahan
   BELUM-STAGED `src/app/layout.tsx` (asal sesi sebelumnya; sesi D tidak
   menyentuhnya).
3. **Server actions PERSIS** (`src/lib/actions/master.ts`, semua menerima
   `FormData`, mengembalikan `Promise<HasilAction>`):
   - `actionBuatCustomer`, `actionUbahCustomer` (field FormData: id*,
     nama, legalName, npwp, alamat, topHari, pph23Default[checkbox]);
     `actionStatusCustomer`
   - `actionBuatVendor`, `actionUbahVendor` (+ vendorType, paymentTerm,
     paymentTermDays); `actionStatusVendor`
   - `actionBuatPort`, `actionUbahPort` (kode, nama, negara)
   - `actionBuatShipLine`, `actionUbahShipLine` (kode, nama)
   - `actionUbahChargeCode` (kode sbg id; keterangan, nameId, category,
     defaultLeg, kategoriFixed[checkbox → FIXED/OPSIONAL], segmentScope
     [DOM|EXIM|BOTH], defaultReimburse, isAtCostDefault, isTaxable,
     pph23Applicable, butuhVendor); `actionStatusChargeCode`
   - Status action membaca `id`, `aktifBaru` ("true"/"false"), `alasan`.
   - `HasilAction = { ok:true; miripDengan?: {id,nama,skor}[] } |
     { ok:false; error:string }`.
4. **daftar\*** di `src/lib/master-data/index.ts` (semua hanya perlu
   `dbOrTx`, urut abadi): `daftarCustomer` (by nama), `daftarVendor`
   (by nama), `daftarPort` (by nama), `daftarShipLine` (by nama),
   `daftarChargeCode` (by kode).
5. **Kolom DB** (dari 0000 + 0002):
   - customers: id, nama, legal_name, npwp, alamat, top_hari,
     pph23_default, aktif
   - vendors: id, nama, legal_name, npwp, vendor_type, payment_term,
     payment_term_days, pph23_default, aktif
   - ports: id, kode (nullable, unique), nama, negara (default 'ID'),
     aktif (ada di DB tetapi TIDAK ditampilkan/dikelola — RENCANA §6)
   - ship_lines: id, kode (nullable, unique), nama, aktif (sama: tidak
     ditampilkan)
   - charge_codes: kode (immutable), keterangan, name_id, category
     (nullable), default_leg, kategori (FIXED|OPSIONAL), segment_scope
     (DOM|EXIM|BOTH), default_reimburse, is_at_cost_default, is_taxable,
     pph23_applicable, butuh_vendor, aktif
6. **Token desain tersedia** di tailwind.config: canvas, parchment, pearl,
   ink/ink-80/ink-48, hairline, divider, accent/accent-focus/accent-dark;
   tanpa shadow.
7. **Komponen siap pakai** `src/components/master/primitives.tsx`:
   PageHeader, DataTable/Kolom, BarisKosong, FormDialog (+Field, Input,
   Checkbox, Select, TextArea), PillButton, PesanHasil, PeringatanMirip,
   BadgeStatus, requiredMark, kls.

## Instruksi SESI E (lanjutkan dari sini)

1. Bangun SATU PER SATU: customers → vendors → ports → ship-lines →
   charge-codes → hub `/master/page.tsx`. Tiap halaman:
   `pnpm tsc --noEmit` + `pnpm vitest run` + `pnpm biome check <file>`
   bersih → `git add` file halaman → commit → lanjut. Jangan menumpuk.
2. Pola halaman (SS4 §10.4): server component async memanggil `daftar*`
   langsung; form create/edit = client component dengan `useActionState`
   membungkus action di atas; dialog edit dipicu searchParams
   (`?edit=<id>`); nonaktifkan hanya untuk customer/vendor/charge code,
   dengan form alasan wajib; ports & ship-lines TANPA tombol status.
3. Setelah 6 halaman ter-commit, TIMPA file ini lagi dengan hasil gate
   literal per halaman.
4. Keputusan desain yang masih terbuka (dari PLAN-SESSION) dan belum
   terjawab: tidak ada — SS4 menjawab semuanya; langsung eksekusi.
