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
- Verifikasi: typecheck + lint + vitest 518/518 + golden 46/46 + e2e 16/16. Tidak ada jawaban baru yang ditebak.
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
