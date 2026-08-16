# HANDOFF Irisan 5 - State Machine Job

**Status: SELESAI** (menunggu review user; branch `iris5-state-machine-approval`, BELUM push).

## Keputusan yang dikunci (Q-IRIS5-1..8, dijawab user 17 Agu 2026)
1. UNLOCK_REQUESTED = nilai enum nyata (migrasi 0005).
2. Nama status: skema menang (DIAJUKAN/DISETUJUI_1/DIBATALKAN); mapping di STATE-MACHINE.md.
3. `jobs.approval_cycle` naik saat reject & unlock_granted.
4. Izin baru: job:cancel (S hanya miliknya via maker_id), job:reject, job:request_unlock.
5. Approver L1 boleh = approver Final (asal != maker).
6. Submit butuh >=1 baris selling>0 DAN >=1 baris pencadangan>0.
7. Audit: 8 aksi spesifik; alasan wajib utk REJECT/REQUEST_UNLOCK/UNLOCK_DENIED.
8. DIBATALKAN terkunci (isLocked); isEditable hanya DRAFT.

## File baru/diubah
- drizzle/0005_iris5_state_machine.sql (generate + review + migrate ke DB dev)
- src/lib/state-machine/index.ts (murni) + transisi.ts (service 8 aksi)
- src/lib/authz/index.ts, src/lib/audit/index.ts, src/db/schema/index.ts
- src/lib/charge-line/index.ts (guard 4b + scope STAFF), src/lib/realokasi/index.ts (cekFinal -> isLocked)
- tests/unit/state-machine.test.ts (10), tests/integration/state-machine.integration.test.ts (28)
- tests/unit/{authz,audit,realokasi}.test.ts diperluas
- docs: STATE-MACHINE.md, RBAC.md, ERD.md, OPEN-QUESTIONS.md, CHANGELOG.md

## Verifikasi
- typecheck bersih; unit SM/authz/audit/realokasi 58/58; integrasi SM 28/28 (real DB).
- Final gate: lihat laporan commit (pnpm test + test:golden harus tetap hijau 39/39).

## Catatan untuk sesi berikutnya
- UI tombol transisi (submit/approve/unlock) sengaja BELUM dibuat (di luar cakupan 5).
- actions/job.ts belum membungkus service transisi (UI menyusul); service sudah
  siap dipanggil dari server action.
- J-INV-3/4 dicek via `customerInvoices` (belum ada invoice nyata - tabel sudah ada).
- Golden 75-job tidak tersentuh (GP tidak memfilter status - kontrak 4d).
