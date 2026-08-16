# HANDOFF IRISAN 4e — Realokasi Biaya (approval-gated, audit-logged)

> Status: ORIENTASI SELESAI + IZIN EKSEKUSI DITERIMA. Belum ada kode ditulis.
> Branch `iris4e-realokasi-biaya` sudah dibuat (dari commit 421709a). JANGAN push sebelum user review diff.

## Keputusan user (7 jawaban, WAJIB diikuti persis)
1. Mekanisme = ADR-0006: overlay logis, INSERT ke `cost_reallocations`. `charge_lines` fisik TIDAK pernah diubah.
2. Approval 1 tingkat: MANAGER/OWNER, approver ≠ pembuat (pakai `assertNotSelfApproval`). `approvedBy IS NULL` = pending. Menolak = HARD DELETE hanya jika `approvedBy IS NULL`, catat audit HAPUS entitas COST_REALLOCATION alasan wajib. Approved tidak boleh dihapus.
3. Pembuat proposal = pemegang `job:edit` (termasuk STAFF). Permission BARU `job:reallocate` KHUSUS aksi approve (MANAGER/OWNER saja).
4. Cap: `jumlah_idr` diajukan + SUM(realokasi APPROVED lain di baris asal sama) ≤ `pencadangan_idr` baris asal. Pending lain tidak dihitung saat pengajuan. Cap WAJIB dicek ulang saat approve (tolak dengan pesan jelas kalau melebihi) — menutup race tanpa locking rumit.
5. FINAL-lock: cek skema dulu. `jobs.status` ADA (enum job_status incl. "FINAL", src/db/schema/index.ts baris 300) → tolak realokasi jika job asal ATAU tujuan berstatus FINAL (per J-INV-1; status lain tidak dikunci di 4e). Tidak ada kolom/migrasi baru untuk ini.
6. Soft-delete charge line yang punya `cost_reallocations` terkait (pending maupun approved) = TOLAK. Guard di `hapusChargeLine`.
7. Kurs: `jumlah_idr` = IDR beku baris asal, tidak di-convert ulang.

## Cek pra-kode yang SUDAH & BELUM
- [x] Grep `drizzle/*.sql`: tabel `cost_reallocations` — BELUM DICEK di sesi ini; migrasi terakhir 0004. CEK: `grep cost_reallocations drizzle/*.sql`. Kalau belum ada → generate migrasi 0005 + terapkan ke DB dev + verifikasi (bukti pnpm test real DB, bukan ECONNREFUSED).
- [x] CHECK constraint audit: skema TS `audit_log.aksi/entitas` = text bebas tanpa CHECK di src/db/schema/index.ts baris 981-998. TETAP cek ulang di drizzle/0000 & 0001 SQL sebelum simpulkan.
- [x] Kolom status jobs: ADA — `status jobStatusEnum` baris 300 (lihat poin 5).
- [x] Tidak ada implementasi/test realokasi existing (grep src/ & tests/ = hanya skema+komentar).

## Baseline golden — BELUM VALID
`pnpm test:golden` → **4 file / 39 tests SKIPPED semua** (bukan hijau/merah). Kemungkinan karena vitest sharding + `--testNamePattern=''`. WAJIB: jalankan ulang sampai benar-benar mengeksekusi test (mis. `pnpm vitest run tests/golden` langsung atau periksa vitest.config.ts) SEBELUM implementasi, dan lagi SESUDAH. Kalau merah → STOP lapor (regresi lain).

## Scope implementasi (final)
- `src/lib/realokasi/index.ts`: `ajukanRealokasi` (job:edit), `setujuiRealokasi` (job:reallocate + assertNotSelfApproval + re-cek cap), `tolakRealokasi` (hard delete pending, audit HAPUS alasan wajib) — pola charge-line/index.ts (transaksi + 1 baris audit + HasilRealokasi).
- `src/lib/audit/index.ts`: tambah aksi `REALOKASI` + entitas `COST_REALLOCATION`; alasan wajib untuk REALOKASI & HAPUS-nya.
- `src/lib/authz/index.ts`: tambah `job:reallocate` ke MANAGER & OWNER.
- `src/lib/charge-line/index.ts` `hapusChargeLine`: tolak jika ada baris `cost_reallocations.originChargeLineId` menunjuk charge line itu.
- Validasi ajukan: charge line ada & aktif, jobs asal/tujuan ada, asal ≠ tujuan, jumlah > 0 & integer, cap poin 4, FINAL check poin 5.
- Test unit murni: cap arithmetic, tolak self-job, tolak jumlah 0/negatif/pecahan, tolak FINAL, tolak exceed cap saat approve.
- Test integrasi (real DB): siklus penuh, audit tercatat, charge_lines fisik tidak berubah, guard soft-delete, golden tidak regresi.
- TIDAK ada UI. TIDAK sentuh Irisan 5. TIDAK commit 4 file termodifikasi yang sudah ada (playwright.config.ts, scripts/backfill-sequence-counters.ts, check-seed.ts, check-sequence.ts).

## Verifikasi wajib sebelum commit
`pnpm test` (real DB, output literal), `pnpm test:golden` (hijau literal), `pnpm typecheck`, `pnpm lint` file 4e. Commit ke branch, JANGAN push.

## Doc updates wajib (guardrails #7)
OPEN-QUESTIONS.md: tutup Q06 impl + entri "Validasi FINAL-lock realokasi ditunda Irisan 5" hanya jika poin 5 berubah; CHANGELOG.md irisan 4e; BUILD-PLAN.md ceklis baris 106-108.
