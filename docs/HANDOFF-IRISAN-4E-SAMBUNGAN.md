# HANDOFF IRISAN 4e — Sambungan (sesi ke-2)

> **Mulai dari sini.** Sesi pertama (2026-08-16 malam) penuh di 98% context
> saat semua kode + test unit selesai ditulis. Sesi ini belum sempat
> menjalankan test apa pun untuk kode baru.

## Status: kode LENGKAP ditulis, BELUM diverifikasi

### Sudah selesai (semua keputusan handoff asli diikuti persis):
1. **Langkah 0 SELESAI**: penyebab golden skip = `package.json` script
   `test:golden` punya `--testNamePattern=''`. Sudah dihapus. Bukti literal:
   `Test Files 4 passed (4) / Tests 39 passed (39)`.
2. **Langkah 1 SELESAI**: `cost_reallocations` SUDAH ADA di
   `drizzle/0000_unusual_rockslide.sql` (dengan FK + unique index). DB dev
   Supabase hidup — `pnpm test` sebelum perubahan 4e: **278 passed, 0 failed**
   (23 file, 859ms). Tidak ada migrasi baru.
3. **Langkah 2 SELESAI**: grep `drizzle/*.sql` → TIDAK ADA CHECK constraint
   apa pun di `audit_log` (aksi/entitas bebas). Tidak perlu migrasi tambahan.

### File yang ditulis/diubah sesi ini (belum di-test-kan):
- `src/lib/audit/index.ts` — tambah aksi `"REALOKASI"`, entitas
  `"COST_REALLOCATION"`, alasan wajib untuk REALOKASI di `writeAudit`.
- `src/lib/authz/index.ts` — tambah action `"job:reallocate"`; diberi ke
  MANAGER + OWNER; STAFF TIDAK (tapi STAFF tetap punya `job:edit` untuk
  mengajukan proposal).
- `src/lib/realokasi/index.ts` — BARU. `ajukanRealokasi` (job:edit),
  `setujuiRealokasi` + `tolakRealokasi` (job:reallocate),
  `daftarRealokasiBaris`, validasi murni `cekJumlahPositifBulat`/`cekCap`/
  `cekFinal` (diekspor). Overlay: charge_lines tidak pernah diubah.
  Cap: diajukan + SUM(APPROVED lain) ≤ pencadangan_idr; pending lain tidak
  dihitung saat ajukan; **re-check cap + FINAL saat approve**. Tolak:
  self-job, alasan kosong, jumlah ≤ 0/pecahan, baris soft-deleted, job
  soft-deleted, originJobId ≠ job baris. Approver ≠ pembuat via
  `assertNotSelfApproval`. Tolak = HARD DELETE proposal pending + audit HAPUS
  alasan wajib; proposal disetujui tidak boleh dihapus.
- `src/lib/charge-line/index.ts` — guard di `hapusChargeLine`: baris dengan
  realokasi (pending/approved) ditolak soft-delete.
- `tests/unit/realokasi.test.ts` — BARU (validasi murni + guard awal dengan
  fakeDb yang meledak kalau transaction terpanggil).
- `tests/unit/audit.test.ts` — +2 test REALOKASI/COST_REALLOCATION.
- `tests/unit/authz.test.ts` — +1 test matriks job:reallocate.

### BELUM dibuat (sesi 2 wajib buat):
- `tests/integration/realokasi.integration.test.ts` — isolasi tahun 2097
  (2096 dipakai charge-line test), prefix ZZRL. Butuh 2 user (seed punya ≥2):
  pembuat = STAFF/MANAGER, approver ≠ pembuat dengan role MANAGER/OWNER —
  ambil langsung dari tabel `users` (kolom: id, email, nama, role, aktif).
  Setup: charge code ZZRL (butuhVendor=false), customer/vendor ZZRL, 2 job
  DRAFT, 1 baris charge line (pencadangan_idr mis. 10.000.000).
  Skenario wajib: (a) self-job ditolak; (b) cap ajukan ditolak; (c) cap
  re-check saat approve ditolak (2 proposal, approve 1 lalu 2 → yang ke-2
  gagal); (d) FINAL-lock ditolak saat approve (UPDATE jobs SET status
  'FINAL' langsung via drizzle lalu restore); (e) approver=pembuat ditolak;
  (f) STAFF approve ditolak; (g) tolak → hard delete + audit HAPUS; (h)
  hapusChargeLine pada baris ber-realisasi ditolak (pending & approved);
  (i) audit REALOKASI tercatat saat ajukan. Cleanup hapus milik sendiri
  lalu `db.$client.end()`. Pola: `tests/integration/charge-line.integration.test.ts`.
- Update `docs/OPEN-QUESTIONS.md` (catatan implementasi 4e), `CHANGELOG.md`,
  `docs/BUILD-PLAN.md` (tandai item realokasi Slice 4 yang selesai).
- Commit ke branch `iris4e-realokasi-biaya` — JANGAN push. Branch belum
  dibuat; cek dulu `git branch --show-current`.

## Urutan eksekusi sesi 2
1. Baca file ini + `docs/HANDOFF-IRISAN-4E.md`.
2. `pnpm test` — perbaiki apa pun yang merah (kode belum pernah dijalankan!).
   Perhatian khusus: `COUNT(*)::int` di guard charge-line, `sql` template di
   `totalDisetujui`, dan import `isNull` yang sudah dihapus dari realokasi.
3. Tulis test integrasi (di atas), jalankan, hijau.
4. `pnpm test:golden` — HARUS 39/39 RUN & HIJAU (bukan skip).
5. `pnpm typecheck`, `pnpm lint` file 4e.
6. Docs + commit + `git diff --stat` + `git log --oneline -3`.

## Perintah kunci
- Test: `pnpm test` (pakai DATABASE_URL .env.local, pooler 6543)
- Golden: `pnpm test:golden`
- Typecheck: `pnpm typecheck` · Lint: `pnpm lint`
