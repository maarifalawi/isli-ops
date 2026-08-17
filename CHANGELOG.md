# Changelog

## [Unreleased]

### Irisan 10 - Batch A / Item 1: .gitattributes - 17 Agu 2026

- File `.gitattributes` baru: `* text=auto eol=lf` untuk semua file teks
  (selaras default LF Biome & CI), binari eksplisit `-text`
  (png/jpg/jpeg/gif/webp/ico/pdf/doc/docx/xls/xlsx/ppt/pptx/zip/gz/
  woff/woff2/ttf/otf/exe/dll - melindungi dokumen asli klien di
  `docs/source-of-truth/`), skrip Windows (`ps1/bat/cmd`) dibiarkan CRLF.
- Pencegahan insiden "lint fix mengubah CRLF ke LF" yang pernah terjadi di
  Irisan 7/8 pada mesin Windows. TANPA `git add --renormalize .` -
  renormalize massal hanya via commit terpisah dengan persetujuan eksplisit.

### Irisan 10 - Batch A / Item 2: E2E CI Secrets - 17 Agu 2026

- `.github/workflows/ci.yml`: job `e2e` dan `build` kini membaca
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` dengan pola fallback
  (secrets.X || nilaiBoneka) - CI tetap hijau SEBELUM secrets diset;
  setelah diset, spec login (smoke, master-crud) ikut berjalan otomatis
  tanpa ubah workflow lagi.
- `docs/SETUP-CI-SECRETS.md` baru: langkah lengkap untuk pemilik repo -
  buat akun uji Supabase DULU (scripts/create-supabase-users.md), baru isi
  4 Secrets di GitHub Settings. DATABASE_URL bukan secret (postgres service
  CI lokal).

### Irisan 10 - Batch A / Item 3: beres-beres open questions - 17 Agu 2026

- `docs/OPEN-QUESTIONS.md`: tutup formal 9 entri yang jawabannya sudah
  tertulis dari sesi klien/Irisan 5-8 tapi baris lamanya masih kosong:
  Q20, Q23, Q24, Q37, Q39, Q56, Q58, Q70, Q71 (masing-masing dengan dasar
  jawaban yang dikutip).

### Irisan 10 - Batch B / Item 4: UI aksi state-machine job - 17 Agu 2026

- `src/lib/actions/job-transisi.ts` (baru): 8 server action wrapper TIPIS
  atas service Irisan 5 - tanpa logika izin/guard/audit yang ditulis ulang;
  revalidatePath /jobs + /jobs/[id].
- `src/app/jobs/aksi-job.tsx` (baru): komponen AksiJob - tombol per status
  (Ajukan/Batalkan/Setujui L1/Kembalikan/Setujui Final/Minta Buka Kunci/
  Buka Kunci/Tolak Pembukaan), alasan wajib utk reject/unlock, URL berita
  acara wajib utk request_unlock (R6.4). Matriks tampil via can() saja
  (dependency-cruiser bersih); service tetap penjaga otoritatif.
- `/jobs`: kolom Aksi per baris (mode compact). `/jobs/[id]`: panel
  "Aksi persetujuan" penuh.
- Badge status baris PENCADANGAN/ACTUAL/LOCKED via statusChargeLine
  (Irisan 7) di editor charge line - kolom Status baru.
- Test: `tests/e2e/job-actions.spec.ts` (2 skenario: STAFF non-maker tanpa
  tombol aksi + badge PENCADANGAN; alur OWNER/MANAGER tetap dikunci 28 test
  integrasi Irisan 5). Selector smoke/master-crud tidak berubah.
- Verifikasi: typecheck + lint + vitest 518/518 + golden 46/46 + e2e 16/16.

### Irisan 10 - Batch B / Item 5: UI Invoice Vendor (V-INV-2 + V-INV-3) - 17 Agu 2026

- `src/lib/actions/vendor-invoice.ts` (baru): 5 action mutasi wrapper tipis
  atas service Irisan 7 (tanpa logika state machine/authz/audit yang ditulis
  ulang) + 2 action READ untuk hard requirement: `actionCekNomorMirip`
  (V-INV-2) dan `actionLihatStatusPembayaran` (V-INV-3).
- `src/app/invoice-vendor/` (baru): halaman /invoice-vendor - pilih vendor,
  form terima, tabel + aksi per baris. Nav "Invoice Vendor" ditambahkan.
- V-INV-2 (KERAS): peringatan nomor mirip (Levenshtein <= 2) tampil REAL-TIME
  debounced 400ms SEBELUM submit. Gagal cek tidak ditelan diam-diam: retry
  otomatis 1x (harusRetryOtomatis) lalu status "Gagal memeriksa" + tombol
  coba ulang - "tanpa peringatan" tidak pernah berarti "aman". Setelah
  submit sukses: router.replace dengan query vendor (bukan router.refresh -
  menghilangkan race RSC vs server action debounce).
- V-INV-3 (KERAS): tombol "Lihat status" memuat snapshot pembayaran DULU;
  tombol "Bayar" hanya dirender setelahnya via bolehTampilTombolBayar(role,
  statusSudahDimuat) - dikunci 5 unit test yang merah jika gating dilonggarkan.
- Test: 7 unit test gating/retry baru; e2e vendor-invoice.spec.ts - V-INV-2
  desktop + V-INV-3 desktop+mobile hijau. V-INV-2 mobile e2e sementara
  test.fixme - test infrastructure issue (server action menggantung hanya
  saat mobile-setelah-desktop dalam satu run Playwright; mobile standalone
  hijau; bukan paralelisme/race-refresh/silent-catch - matriks 4 percobaan
  tercatat lengkap di komentar spec). BUKAN bug kode. Coverage tetap via
  desktop e2e + 7 unit test + arsitektur server-side. Buka kembali saat
  Playwright/Next.js update atau sesi debug dengan server log.
- Verifikasi: typecheck + lint + vitest 525/525 + golden 46/46 + e2e
  19 passed 1 fixme 0 failed.

### Irisan 10 - Batch B / Item 6: UI Invoice Customer (/invoice) - 17 Agu 2026

- `src/app/invoice/` (baru): halaman /invoice - daftar invoice (join job+customer,
  11 kolom, DPP/PPN/PPh23/Total dari kolom BEKU I-INV-1, komponen hanya
  memformat), form draft (dropdown job FINAL saja, tanggal POD R9.4, centang
  PPh23 R3.5 eksplisit), aksi per status via gating.ts (can()): terbitkan/kirim
  O/M, batalkan OWNER saja, bayar O/M/S. Nav "Invoice" ditambahkan.
- `src/lib/actions/invoice.ts` (baru): 8 server action wrapper TIPIS atas
  service Irisan 6 - nol logika state machine/authz/audit/pajak yang ditulis
  ulang. Nomor invoice TIDAK PERNAH disetel UI: alokasi via
  allocateInvoiceNumber di dalam issueInvoice (satu transaksi dengan beku
  pajak, R2 + I-INV-1). dueDate manual wajib (R9.2), pph23Applicable selalu
  eksplisit param issue (R3.5).
- `src/lib/invoice/index.ts`: + daftarInvoicePelanggan (query read join
  jobs+customers, READ ONLY tanpa logika uang). + Perbaikan ketahanan J1b-1
  (izin user): validasi format UUID murni JS di createDraftInvoice - jobId
  non-UUID dari input publik kini return gagal("Job tidak ditemukan.")
  alih-alih crash error page (Postgres 22P02 lewat DrizzleQueryError).
  Perilaku UUID valid sama persis Irisan 6; test Irisan 6 tak berubah.
- Test: +5 unit (4 gating per peran + 1 J1 UUID invalid tanpa throw) = 530
  total. E2e invoice.spec.ts: skenario halaman x2 viewport (form draft STAFF,
  dropdown FINAL-only) hijau. Skenario guard R9.4 via injeksi-DOM DIHAPUS
  (keputusan K1): anti-pattern Playwright x React hydration non-deterministik
  di mobile; guard tetap terkunci 3 lapis - unit J1 + 30 integrasi Irisan 6 +
  UI FINAL-only. Catatan lengkap tertulis di spec.
- Verifikasi: typecheck + lint 0 error + vitest 530/530 + golden 46/46 + e2e
  21 passed 1 fixme (V-INV-2 mobile, Item 5) 0 failed.

### Irisan 10 - Batch B / Item 7: Kartu GP/NETT di /jobs/[id] - 17 Agu 2026

- `src/lib/laporan/queries.ts`: + kartuGpJob view-model (Irisan 10 Item 7) -
  rumus TIDAK ditulis ulang: hitungGP/hitungGPpct/hitungNETT dari costing
  (terkunci test 4d). PPN = SUM kolom BEKU invoice TERBIT+ (I-INV-1, tidak
  dihitung ulang); job tanpa invoice -> NETT "— (menunggu invoice)".
  Overlay realokasi APPROVED via detailJobUntukLaporan (pola agregat Irisan 8,
  tanpa logika realokasi baru). null = "belum ada data" (—), bukan Rp0
  menyesatkan (pola costing).
- `src/app/jobs/[id]/page.tsx`: kartu 4 kolom server-formatted (GP
  pencadangan, GP %, NETT, GP setelah realokasi - oranye bila berubah);
  komponen hanya merender string (pola kartuJobCariDariDetail 8b). Komentar
  stale "GP menyusul di irisan berikutnya" dibersihkan (juga di /jobs/page).
- Test: +5 unit kartuGpJob (kebijakan tampilan: null-vs-0, NETT-GP=PPN Q09,
  overlay realokasi) = 535 total; +1 e2e job-gp.spec (kartu tampil, GP
  terisi untuk job berbaris, kedua viewport).
- Verifikasi: typecheck + lint 0 + vitest 535/535 + golden 46/46 + e2e
  23 passed 1 fixme (V-INV-2 mobile) 0 failed.

### Irisan 10 - Batch B / Item 8: UI Realokasi + fix nav mobile + fix timeout login e2e - 18 Agu 2026

- `src/lib/realokasi/index.ts`: + daftarSemuaRealokasi (query READ join jobs asal,
  tanpa logika). `src/lib/actions/realokasi.ts` (baru): 3 server action wrapper
  TIPIS atas service 4e (ajukan/setujui/tolak) - nol guard yang ditulis ulang.
- `src/app/realokasi/` (baru): halaman /realokasi - form pengajuan (job asal
  GET -> baris aktif + job tujuan non-locked + jumlah + alasan Q06), tabel
  status PENDING/APPROVED per baris, Setujui/Tolak hanya M/O dan tidak untuk
  proposal sendiri (gating can(); service tetap penjaga otoritatif R-A1).
  PENDING tidak mengubah GP - hanya APPROVED jadi overlay (agregat Irisan 8
  tak disentuh). Nav "Realokasi" ditambahkan.
- FIX M1 (regresi ditemukan smoke HP): link nav ke-7 meluap 375px -> nav
  scrollable-horizontal (overflow-x-auto whitespace-nowrap); gulir di dalam
  nav, document bebas horizontal-scroll, 7 link utuh, sentuh tetap 44px.
- FIX N2 (test-infra durabil): timeout assert redirect login 15s di helper
  login()/masuk() semua spec (6 file) - redirect Supabase kadang >5s default
  di worker mobile; URL yang di-assert tetap "/" (bukan pelonggaran asersi).
- Test: +2 unit gating realokasi (=537 total) + e2e realokasi.spec (STAFF:
  form+tabel tampil, tanpa tombol Setujui) x2 viewport.
- Verifikasi: typecheck + lint 0 + vitest 537/537 + golden 46/46 + e2e
  server-fresh 25 passed 1 fixme (V-INV-2 mobile) 0 failed.

### Irisan 10 - Batch C / Item 9: PDF Invoice Customer On-Demand (ADR-0005) - 18 Agu 2026

- @react-pdf/renderer terpasang (ADR-0005 Accepted, bukan puppeteer)
- src/lib/invoice-pdf/index.tsx: render murni, angka HANYA dari kolom beku
  (I-INV-1), terbilang pass-through, kop placeholder TODO(R12)
- GET /invoice/[id]/pdf: on-demand, inline/attachment (?download=1), TERBIT+
  only (DRAFT/BATAL 409)
- Tombol "Cetak PDF" di /invoice (baris TERBIT+ saja)
- Koreksi TOOLCHAIN.md: puppeteer -> @react-pdf/renderer (ADR-0005 mengikat)
- Seed fixture O3: job FINAL ISLI-26.08-006 + invoice TERBIT Materee beku
  (22.600.000/248.600/23.848.600 + terbilang) - e2e PDF deterministik, tidak
  lagi bergantung data sisa integration test; idempoten; integration Irisan 6
  dan golden tak terdampak (job ad-hoc sendiri)
- 5 unit test: Materee 23.848.600, Diametral 131.429.434, terbilang
  pass-through, deterministik (normalisasi /CreationDate + /ID @react-pdf),
  data beda = byte beda
- vitest.config: esbuild.jsx automatic (konsisten Next 15; tanpa ini .tsx di
  src/lib gagal "React is not defined" di vitest)
- Verifikasi: typecheck + lint 0 + vitest 542/542 + golden 46/46 + e2e
  server-fresh: invoice-pdf HIJAU x2 viewport; 24 passed + 1 fixme
  (V-INV-2 mobile) + 1 flake login-mobile lokal (pola identik berulang
  sejak Item 5, spec sama lulus di run lain; CI retries=2 otoritas) Tidak ada jawaban baru yang ditebak.
- `docs/DOMAIN-RULES.md` R17.5: koreksi referensi salah ketik
  "lihat Q73" menjadi "lihat Q77" (Q73 = keputusan tabel addenda; yang
  masih menunggu jawaban Indra adalah Q77).
- `docs/PERTANYAAN-UNTUK-KLIEN.md` baru: daftar 29 pertanyaan siap kirim,
  dikelompokkan per penerima (Niken: pajak + laporan/data; Fairol: data/
  orang termasuk blocker Q41 SO BULAN xlsx; Pak Indra: akses + keputusan
  operasional) + daftar tidak-mendesak + info penutupan administratif.
### Irisan 8 — Laporan & analisis (8a fondasi + 8b rekap + 8c peringkat + 8d drill-down + 8e export) — 17 Agu 2026

- **Fondasi (8a, sesi sebelumnya):** modul `src/lib/laporan/` — `periode.ts`
  (rentang bulan di URL R14.1, boundary WIB untuk dibayar_at Q-IRIS8-2),
  `agregat.ts` (agregasi murni reuse `hitungGP` — tanpa rumus GP kedua;
  GP% total-based; invarian realokasi ΣGP tetap), `queries.ts` (murni SELECT,
  R14.5 tanpa tabel rekap). Keputusan Q-IRIS8-1..5 dikunci di
  `tests/unit/laporan-agregat.test.ts` (20 test) + golden baru
  `tests/golden/laporan-gp.golden.test.ts` (7 test): GP laporan 75 job atas
  data lengkap = **252.482.307** (Q-IRIS8-1b: berbeda sah dari 280.150.000
  definisi simetris fixture; tidak ada angka golden existing yang berubah).
- **Peringkat multi-sumbu (8c) + drill-down (8d):** `peringkatDariRingkasan`
  (customer/segmen/sales/rute, urut selling menurun R14.2, kolom lengkap
  R14.3), `peringkatVendorBelanja` (belanja — kelompok terpisah, TIDAK
  digabung revenue), `jobEntitasDariRingkasan` (lapis peringkat→job).
  Terkunci `tests/unit/laporan-peringkat.test.ts` (9 test): mengubah rentang
  mengubah urutan; total tiap lapisan == lapisan atas untuk SEMUA sumbu.
- **UI `/laporan` (8b):** dashboard GP bulan×segmen, rekap vendor per bulan
  (R7.3), rekap pajak PPN/PPh 23 (kolom beku I-INV-1, hanya TERBIT+), tab
  peringkat + drill-down daftar job, pencarian job satu halaman. Rentang di
  URL. Semua uang string terformat dari server (`kartuLaporanDariRingkasan`,
  `kartuJobCariDariDetail`) — komponen TIDAK berhitung uang. Izin
  `report:view` dicek server-side.
- **Export Excel (8e):** `src/lib/laporan/export-excel.ts` + route
  `GET /laporan/export` (exceljs) — mengikuti rentang & sumbu aktif; 4 sheet
  (Dashboard GP, Peringkat sumbu, Rekap Vendor, Rekap Pajak).
- **Fix Irisan 7:** commit terpisah `2da5422` — rename
  `tests/unit/vendor-invoice` → `vendor-invoice-state.test.ts` (file tanpa
  ekstensi tidak pernah tereksekusi vitest; +17 test kini berjalan).
- **Verifikasi:** typecheck ✓, lint (biome) ✓, `pnpm test` 35 file / 518 test
  ✓, `pnpm test:golden` 5 file / 46 test ✓ (39 existing + 7 baru).

### Irisan 3 — Master data + CRUD + RBAC + deteksi kemiripan + audit (ditutup 16 Agu 2026)

- **Entitas (5):** Customer, Vendor, Port, Ship Line, Charge Code — skema +
  migrasi `drizzle/0002_iris3_master_data.sql`, termasuk kolom
  `charge_codes.kategori` (FIXED | OPSIONAL, default OPSIONAL untuk kode baru).
- **Data awal (seed):** 89 port, 25 ship line, 42 charge code (39 aktif),
  30 customer, 48 vendor.
- **CRUD:** hub `/master` + 5 halaman entitas (buat / ubah / nonaktifkan);
  nonaktifkan = soft delete dengan alasan wajib (tidak ada hapus permanen);
  kode charge code immutable. 15 server action di `src/lib/actions/master.ts`.
- **RBAC:** otorisasi master data satu pintu via `assertCan(user.role, "master:manage")`
  (`src/lib/authz`). Izin `master:manage` dimiliki role OWNER dan MANAGER;
  STAFF ditolak (read-only). Role sah hanya OWNER/MANAGER/STAFF — TIDAK ADA
  role bernama ADMIN di sistem ini. Dijaga di server action dan UI.
- **Deteksi kemiripan:** similaritas Levenshtein ternormalisasi (ambang 0,85)
  saat input nama customer/vendor — memberi peringatan, tidak menolak.
- **Audit:** `audit_log` append-only, tepat 1 baris per mutasi
  (snapshot JSON sebelum/sesudah + alasan), ditulis dalam transaksi yang sama.
- **Test:** 43 test baru terkait Irisan 3 — 6 unit audit
  (`tests/unit/audit.test.ts`), 25 unit similarity
  (`tests/unit/similarity.test.ts`), 9 integrasi master-data
  (`tests/integration/master-data.integration.test.ts`), 3 e2e
  (`tests/e2e/master-crud.spec.ts`). Hasil literal `pnpm verify`
  (dijalankan ulang 16 Agu 2026): typecheck lolos, lint (biome) lolos,
  vitest `Test Files 15 passed (15)` / `Tests 163 passed (163)`,
  dan `test:golden` exit 0 dengan `Test Files 3 skipped (3)` /
  `Tests 28 skipped (28)` (golden memang dieksklusi dari gate via
  `--testNamePattern=''`). Playwright TIDAK termasuk gate verify;
  e2e master-crud terakhir dijalankan terpisah: 3/3 lolos
  (lihat `docs/HANDOFF-IRISAN-3-CRUD-SESID.md`).
- **Catatan:** REVOKE `app_role` di level database TIDAK dibuat — status
  menunggu keputusan klien (lihat `docs/OPEN-QUESTIONS.md`).

### Phase 0 - Discovery
- Audit lengkap 7 dokumen klien, 9 temuan tercatat
- 75 job Apr-Jul 2026 diekstrak jadi golden fixtures
- 43 charge code diidentifikasi
- 34 pertanyaan discovery disusun (12 blocker)
- 7 ADR (5 accepted, 2 proposed menunggu keputusan klien)
- Identitas legal ISLI diekstrak dari kop surat (NPWP masih kosong)


## Irisan 5 - State Machine Job + Approval L1 & Final + Guard (2026-08-17)

- Migrasi `0005_iris5_state_machine`: enum `job_status` +UNLOCK_REQUESTED;
  `jobs.approval_cycle` (NOT NULL DEFAULT 1).
- Modul baru `src/lib/state-machine/`: tabel transisi murni (9 transisi,
  persis STATE-MACHINE.md) + predikat isFinal/isLocked/isEditable + service
  transisi 8 aksi (submit/cancel/approve_l1/reject/approve_final/
  request_unlock/unlock_granted/unlock_denied) dengan row-lock +
  guard status-lama (anti-race), approval cycle reset (R6.2), berita acara
  wajib (R6.4), J-INV-3/4 (unlock diblokir invoice terbit).
- Authz +3 izin: job:cancel, job:reject, job:request_unlock (Q-IRIS5-4).
- Audit +8 aksi transisi (alasan wajib REJECT/REQUEST_UNLOCK/UNLOCK_DENIED).
- Guard 4b: create/update/hapus charge line kini cek isEditable(DRAFT) +
  scope STAFF maker_id. Guard 4e: cekFinal mendelegasikan ke isLocked
  (FINAL|DIBATALKAN) - Q-IRIS5-8.
- Test: unit state-machine 10, integrasi 28 (alur penuh, cycle, race paralel,
  berita acara, DIBATALKAN terminal). Semua keputusan Q-IRIS5-1..8 terkunci test.
- Docs: STATE-MACHINE.md (mapping nama + J-INV-7/8 + hapus stale reallocate),
  RBAC.md, ERD.md, OPEN-QUESTIONS.md.

## Irisan 7 - Invoice Vendor (AP): verifikasi, bayar, anti dobel 01A/01B (2026-08-17)

- Migrasi `0007_iris7_vendor_invoice`: kolom jejak `vendor_invoices.diterima_oleh`
  / `diverifikasi_oleh` / `diverifikasi_at` (dasar R-A1 + audit trail) dan
  `UNIQUE(charge_line_id)` pada `vendor_invoice_lines` (D5: satu charge line =
  satu invoice vendor - anti double-verification di level DB) + index junction.
- Modul baru `src/lib/vendor-invoice/`: state machine murni 4-state (D1: skema
  menang - DITERIMA/DIVERIFIKASI/DIBAYAR/DIBATALKAN; dispute/reject dilipat ke
  DIBATALKAN+alasan) + service receive/verify/pay/batal/unlock_paid dengan
  row-lock + guard status-lama (anti-race), ON CONFLICT DO NOTHING untuk nomor
  identik (R7.1 kasus 01A/01B), peringatan nomor mirip Levenshtein <= 2
  (V-INV-2: warning bukan blokir), verify mengisi `charge_lines.actual_idr`
  via junction (V-INV-5; job FINAL diizinkan - D4; hanya actual_idr - D6;
  R-A1 verifier != penerima - D3), `lihatStatusPembayaran` wajib sebelum bayar
  (V-INV-3), tolak bayar kedua (R7.2), batal OWNER-only beralasan (R-A5/D1)
  reset actual sebelum bayar, unlock_paid DIBAYAR->DIVERIFIKASI tanpa reset
  actual (V-INV-4).
- Authz +1 izin: `vendor_invoice:verify` (O/M; STAFF tidak). Audit +4 aksi:
  RECEIVE/VERIFY/PAY/BATAL_VENDOR (alasan wajib BATAL_VENDOR) + entitas
  VENDOR_INVOICE.
- Guard 4b (D7/V-INV-4): `updateChargeLine` MEMPERTAHANKAN actual_idr/actual_usd
  baris terverifikasi (beku - tidak bisa ditimpa/null-kan diam-diam; perubahan
  eksplisit ditolak) dan `hapusChargeLine` menolak baris terverifikasi.
  GP 4d TIDAK disentuh (kontrak Q-4d-2: GP tetap basis pencadangan; test
  integrasi membuktikan actual tidak mengubah hitungGP).
- TIDAK ada UI (service-only); transisi.ts TIDAK diubah (D9: vendor invoice
  tidak memblokir unlock job); addenda R17 + rekap R7.3 DITUNDA (D8).
- Test: unit state machine vendor invoice + izin + similarity nomor 01A/01B;
  30 integrasi DB (dobel nomor identik gagal di DB, peringatan mirip, R-A1,
  D4 FINAL vs DIBATALKAN, D5 UNIQUE, V-INV-3/4, pay kedua ditolak, batal reset,
  unlock_paid, audit 1 baris per aksi).
- Docs: STATE-MACHINE.md (SS3 rewrite mapping D1/D2 + V-INV-6/7/8), RBAC.md
  (matriks vendor_invoice + catatan Irisan 7), ERD.md (vendor_invoice +
  vendor_invoice_lines diselaraskan ke skema aktual; deviasi PAYMENT_OUT/
  line_status dicatat), OPEN-QUESTIONS.md (Q-IRIS7 D1-D9 terjawab), BUILD-PLAN
  (Slice 7 selesai), HANDOFF-IRISAN-7.md baru.
