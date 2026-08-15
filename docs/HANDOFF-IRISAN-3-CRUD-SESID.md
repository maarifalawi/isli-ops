# HANDOFF IRISAN 3 CRUD — SESI D4 (STATUS AKURAT, DITIMPA)

## Status terkini (jujur)

**Sesi D4 TIDAK membangun halaman apa pun.** Context window sudah ~91%
terpakai setelah fase verifikasi (membaca handoff, pola ports/ship-lines,
skema, actions, DOMAIN-RULES). Memulai menulis vendors pada titik itu
berisiko meninggalkan halaman setengah jadi tanpa gate/commit — dilarang
oleh instruksi sesi ("jangan paksakan setengah jadi"). Maka sesi ini
dipakai untuk VERIFIKASI TOTAL dan hasilnya ditulis di bawah supaya sesi
berikutnya tinggal menulis dua file per halaman tanpa riset ulang.

**Halaman selesai (sesi sebelumnya):**
- `/master/ports` — commit `5191997` (sesi D2).
- `/master/ship-lines` — commit `325a7bf` (sesi D3).

**Sisa urutan:** vendors → customers → charge-codes → hub
`/master/page.tsx` (paling akhir). Satu sesi SATU halaman (vendors dan
customers sangat mirip — bila context lega boleh dua, vendors dulu sampai
hijau + commit).

## Fakta TERVERIFIKASI sesi D4 (tidak perlu dicek lagi)

### 1. Server actions PERSIS (`src/lib/actions/master.ts`)
Semua menerima `FormData`, mengembalikan `Promise<HasilAction>`;
`HasilAction = { ok:true; miripDengan?: {id,nama,skor}[] } | { ok:false; error:string }`.
- `actionBuatVendor` — baca: nama*, legalName, npwp, vendorType
  (enum lokal SHIPPING|CONT|TRUCKING|OTHERS), paymentTerm,
  paymentTermDays, pph23Default (checkbox "on").
- `actionUbahVendor` — sama + id*.
- `actionStatusVendor` — baca: id*, aktifBaru ("true"/"false"), alasan.
- `actionBuatCustomer` — baca: nama*, legalName, npwp, alamat, topHari,
  pph23Default (checkbox "on").
- `actionUbahCustomer` — sama + id*.
- `actionStatusCustomer` — baca: id*, aktifBaru, alasan.
- (Sudah ada juga: actionBuatPort/UbahPort — DIPAKAI, actionBuatShipLine/
  UbahShipLine — DIPAKAI, actionUbahChargeCode + actionStatusChargeCode.)

### 2. Kolom skema PERSIS (`src/db/schema/index.ts`, verified)
- vendors: id, nama, legalName, npwp, vendorType (NOT NULL,
  SHIPPING|CONT|TRUCKING|OTHERS, default SHIPPING), paymentTerm
  (NOT NULL, default TOP), paymentTermDays (NOT NULL default 30),
  pph23Default (NOT NULL default false), aktif.
- customers: id, nama, legalName, npwp, alamat, topHari
  (NOT NULL default 30), pph23Default (NOT NULL default false), aktif.
- Return type daftarVendor/daftarCustomer (master-data) = kolom DB
  kecuali dibuatDiperbarui: { id, nama, legalName, npwp, ...(di atas), aktif }.

### 3. Kontrak nonaktifkan (`ubahStatusAktif` + `UbahStatusInput`)
`UbahStatusInput { id: string; aktifBaru: boolean; alasan?: string | null }`.
**NONAKTIFKAN: alasan WAJIB** — fungsi mengembalikan
`gagal("Alasan nonaktifkan wajib diisi.")` bila kosong. Reaktivasi
(AKTIFKAN): alasan opsional. Audit: NONAKTIFKAN/AKTIFKAN (bukan HAPUS).
→ UI vendors/customers WAJIB punya form alasan saat menonaktifkan;
  ports/ship-lines tidak punya tombol ini (kolom aktif ada tapi tak dikelola).

### 4. Aturan DOMAIN-RULES untuk pph23
**R3.5 "Kapan PPh 23 dipotong" (BLOCKER)**: `> Agent: JANGAN pilih salah
satu. Sampai terjawab, pph23_applicable adalah field manual ...` —
artinya: tampilkan pph23Default sebagai checkbox/toggle MANUAL di form;
JANGAN disimpulkan dari data lain. (Catatan: di master bernama
`pph23Default`; `pph23_applicable` adalah field per-invoice/job.)
NPWP: tampilkan apa adanya; TANPA validasi format, tanpa menebak nilai kosong.

### 5. Komponen primitif (`src/components/master/primitives.tsx`)
HalamanJudul, PeringatanMirip({items:{nama,skor}[]}), BadgeStatus({aktif}),
PesanHasil({hasil}), TombolPill({varian:"utama"|"merusak"|"netral"}),
kelasInput, kelasTombolSekunder, Field({label}).
PeringatanMirip di-render bila `hasil.miripDengan?.length` — sama seperti
form ports (`PeringatanMirip items={hasil.miripDengan ?? []}`). Ini yang
mendeteksi kasus MATEREE/MATEREE NUSANTARA (cariKandidatMirip di
master-data dipanggil otomatis oleh actionBuat*/actionUbah* vendor/customer).

### 6. Pola halaman (tiru ports/ship-lines PERSIS)
- page.tsx: server component, `export const dynamic = "force-dynamic"`,
  `await requireUser()`, `await searchParams` ({edit?: string}),
  `daftarVendor(db)`; section form max-w-md border-hairline bg-pearl p-4
  (FormUbah bila ?edit= cocok, else FormBuat); tabel `thead bg-parchment`,
  `th px-3 py-2 text-left text-micro uppercase text-ink-48` (Aksi
  text-right), baris `border-b border-divider`, link Ubah
  `?edit=<id>` text-accent.
- form.tsx: "use client"; FormBuatX & FormUbahX; useActionState(action,
  null); nama* required minLength 2 autoFocus; field lain defaultValue;
  checkbox defaultChecked; submit → !res.ok setNiat("error"), res.ok →
  router.push("/master/<halaman>") + router.refresh(); PesanHasil +
  PeringatanMirip + TombolPill Simpan + batal kelasTombolSekunder.
- TAMBAHAN vendors/customers vs ports: kolom Status (BadgeStatus aktif)
  + aksi Nonaktifkan/Aktifkan. Saran bentuk konsisten dengan pola:
  form nonaktif kecil per baris (atau dialog) yang POST actionStatusX
  dengan hidden id + aktifBaru="false" + textarea/input alasan WAJIB;
  reaktivasi tombol langsung aktifBaru="true". Angka (topHari/
  paymentTermDays) pakai tabular-nums.
- Kolom tabel vendors: Nama, Tipe, Term (+hari), PPh23, Status, Aksi.
  Kolom customers: Nama, TOP (hari), PPh23, Status, Aksi.
  (NPWP/alamat/legalName boleh tidak di tabel — ada di form edit.)
- Gate per halaman: `pnpm tsc --noEmit` ; `pnpm vitest run` ;
  `pnpm biome check` (file baru: `npx @biomejs/biome check <file> --write`
  dulu). Commit: `feat(master-vendors): halaman CRUD /master/vendors - Irisan 3`.
- PowerShell: pakai `;` bukan `&&`. Vitest penuh butuh Postgres lokal.

### 7. Charge-codes (sesi berikutnya, JANGAN sekarang)
kode immutable (input disabled saat edit), segmentScope select
DOM|EXIM|BOTH, kategoriFixed checkbox → FIXED|OPSIONAL, + tombol
nonaktifkan (actionStatusChargeCode). Lihat butir 1 handoff lama untuk
field lengkap actionUbahChargeCode.
