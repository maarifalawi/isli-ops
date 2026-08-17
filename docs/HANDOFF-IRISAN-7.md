# HANDOFF-IRISAN-7.md — Invoice Vendor (AP)

> Serah terima sesi 17 Agu 2026, branch `iris7-invoice-vendor` (BELUM di-push).
> Slice 7 BUILD-PLAN: service selesai, **UI ditunda** (service-only).

## Yang dikerjakan

1. **Migrasi `drizzle/0007_iris7_vendor_invoice.sql`** (diperiksa & diterapkan ke DB dev):
   - `vendor_invoices.diterima_oleh` / `diverifikasi_oleh` / `diverifikasi_at` + FK users — jejak siapa menerima & verifikasi (dasar R-A1).
   - `UNIQUE(charge_line_id)` di `vendor_invoice_lines` (`uq_vendor_inv_line_charge_line`) — **D5: satu charge line = satu invoice vendor**, anti double-verification di level DB.
   - `idx_vinv_line_invoice` untuk query junction.
2. **`src/lib/vendor-invoice/state.ts`** — state machine murni 4-state (D1: skema menang). TRANSISI_VENDOR_INVOICE: `DITERIMA→verify→DIVERIFIKASI→pay→DIBAYAR`; `batal` dari DITERIMA/DIVERIFIKASI; `DIBAYAR→unlock_paid→DIVERIFIKASI`. Predikat `isDibayar`/`isDibatalkan`/`mengunciActual` (DIVERIFIKASI|DIBAYAR).
3. **`src/lib/vendor-invoice/index.ts`** — service satu pintu (pola transisi.ts/invoice 6):
   - `terimaInvoiceVendor` (receive): O/M/S; nomor = teks persis kertas vendor; **ON CONFLICT DO NOTHING + RETURNING** (pesan bersih bila nomor identik — R7.1); **peringatan nomor mirip** Levenshtein ≤ 2 pada vendor sama (V-INV-2, warning bukan blokir); isi `diterima_oleh`.
   - `verifikasiInvoiceVendor`: O/M (D3) + **R-A1 verifier ≠ penerima** (baris tanpa `diterima_oleh` ditolak); job DIBATALKAN ditolak, **job FINAL diizinkan** (D4); D5 cek junction + UNIQUE DB backstop race; konsistensi vendor baris vs invoice; baris soft-deleted/nilai ≤ 0 ditolak; INSERT junction + **UPDATE `actual_idr` SAJA** (D6 — `actual_usd` tak disentuh; `selisih_idr` terhitung generated); status → DIVERIFIKASI + jejak; audit VERIFY.
   - `lihatStatusPembayaran`: snapshot status/jumlah/dibayarAt — **wajib ditampilkan sebelum konfirmasi bayar (V-INV-3)**.
   - `bayarInvoiceVendor`: O/M; DIVERIFIKASI→DIBAYAR (dibayarAt/dibayarOleh); **bayar kedua ditolak dengan pesan R7.2**; audit PAY.
   - `batalkanInvoiceVendor`: **OWNER saja + alasan wajib** (R-A5; tulis kasus: ditolak/dispute/revisi — D1). Sebelum bayar: hapus junction + **reset `actual_idr` NULL** (baris bebas diverifikasi ulang — alur revisi Bu Niken). Setelah bayar: batal DITOLAK (harus unlock_paid dulu).
   - `bukaKunciDibayar`: OWNER + alasan; DIBAYAR→DIVERIFIKASI; **actual TIDAK di-reset** (V-INV-4); bisa dibayar ulang.
   - Query bantu: `chargeLineTerverifikasi` (guard D7), `statusChargeLine` (PENCADANGAN/ACTUAL/LOCKED turunan — STATE-MACHINE §4), `daftarInvoiceVendor`, `junctionChargeLine`.
4. **Authz**: izin baru `vendor_invoice:verify` (O/M; STAFF ✗). Mapping D2: AP Staff=STAFF (receive saja), Finance Manager=MANAGER.
5. **Audit**: aksi RECEIVE/VERIFY/PAY/BATAL_VENDOR (alasan wajib BATAL_VENDOR) + entitas VENDOR_INVOICE. `unlock_paid` memakai UNLOCK_GRANTED.
6. **Guard 4b (`src/lib/charge-line/index.ts`)** — D7/V-INV-4: `updateChargeLine` pada baris terverifikasi (a) menolak perubahan `actualUsd` eksplisit, (b) **mempertahankan** `actualIdr`/`actualUsd` existing (beku — termasuk tidak me-null-kan diam-diam untuk baris IDR yang kolomnya tak ada di input); field lain boleh diubah. `hapusChargeLine` menolak baris terverifikasi. Baris belum terverifikasi → input manual actual masih boleh (backward compat).
7. **Yang TIDAK disentuh** (sesuai keputusan): `src/lib/costing/` (kontrak Q-4d-2 — GP basis pencadangan; test membuktikan verifikasi tidak mengubah `hitungGP`), `src/lib/state-machine/transisi.ts` (D9: vendor invoice tidak memblokir unlock), `vendor_invoice_addenda` (R17, D8 tunda), UI apa pun.

## Test (semua hijau)

- `tests/unit/vendor-invoice-state.test.ts` — tabel transisi persis D1, terminal DIBATALKAN/DIBAYAR, izin D2/D3, `jarakLevenshtein` 01A/01B.
- `tests/integration/vendor-invoice.integration.test.ts` (30, DB nyata, isolasi tahun 2093/prefix ZZV7) — dobel nomor identik gagal **di level DB** (test wajib BUILD-PLAN Slice 7), peringatan 01B, nomor sama vendor beda boleh, R-A1 self-verify, D4 FINAL✓/DIBATALKAN✗, D5 UNIQUE, vendor mismatch, nilai 0, actual+selisih generated, GP tak berubah, D7 beku/hapus ditolak, V-INV-3, bayar kedua ditolak, batal reset + verifikasi ulang, unlock_paid, terminal, audit 1 baris/aksi.
- Satu iterasi perbaikan: INSERT duplikat semula pakai try/catch — postgres.js melempar error meski `return gagal()` (transaksi sudah abort) → diganti `onConflictDoNothing().returning()` (pola allocator Irisan 2); `uq_vendor_invoice` tetap backstop DB.

## Docs terpasang (commit yang sama)

`STATE-MACHINE.md` §3 (mapping D1/D2 + V-INV-6/7/8) · `RBAC.md` (matriks + catatan Irisan 7) · `ERD.md` (vendor_invoice/vendor_invoice_lines = skema aktual; deviasi `PAYMENT_OUT`/`line_status`/`is_reimbursement`/`due_date`/`received_by` dicatat) · `OPEN-QUESTIONS.md` (Q-IRIS7-1..9) · `BUILD-PLAN.md` (Slice 7 ✅ service) · `CHANGELOG.md`.

## Keterbatasan yang DISENGAJA (jangan "perbaiki" diam-diam)

- **D5**: 1 charge line = 1 invoice vendor (partial/multiple = irisan terpisah).
- **D6**: verifikasi hanya isi `actual_idr` — `actual_usd` tak disentuh (R8.2: IDR sumber kebenaran tunggal).
- **D8**: addenda R17 + rekap pembayaran vendor R7.3 belum dibangun (tabel addenda idle).
- **D9**: vendor invoice tidak memblokir unlock job.
- **PAID manual**: `dibayarAt/dibayarOleh` — tanpa tabel payment_out, tanpa partial payment.
- **PPh 23 vendor** (`pph23_idr`): input manual eksplisit default 0 — Q14/R3.7 masih ⚠️ DUGAAN, TIDAK PERNAH dihitung otomatis.
- **UI belum ada** — belum ada server action wrapper (`src/lib/actions/`) maupun halaman; service dipanggil langsung dari test.

## Untuk sesi berikutnya

1. **UI invoice vendor** (halaman + server actions memanggil service ini) — ikuti DESIGN-SYSTEM.md; peringatan nomor mirip harus TERLIHAT sebelum submit (V-INV-2); status bayar tampil sebelum tombol bayar (V-INV-3).
2. **Addenda vendor R17** + sisa kuota (R17.3) — tunggu Q77.
3. **Rekap pembayaran vendor per bulan (R7.3)** — Slice 8b.
4. Integrasi UI jobs/[id]: tampilkan badge status baris (PENCADANGAN/ACTUAL/LOCKED via `statusChargeLine`).
5. Pertanyaan tetap terbuka: Q14 (PPh 23 vendor), Q64, Q77, Q21.