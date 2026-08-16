import { and, eq, inArray, like } from "drizzle-orm";

/*
 * Test integrasi state machine job - Irisan 5. BUTUH DATABASE_URL (.env.local).
 *
 * Membuktikan (keputusan user Q-IRIS5-1..8, 17 Agu 2026):
 *   - alur penuh DRAFT -> DIAJUKAN -> DISETUJUI_1 -> FINAL dengan TEPAT 1
 *     baris audit per transisi + baris approvals (cycle/tingkat);
 *   - J-INV-5: approver != maker (R-A1) di kedua tingkat;
 *   - Q-IRIS5-3: reject & unlock_granted menaikkan approval_cycle; submit
 *     ulang + approve L1 di cycle baru TIDAK menabrak uq_approval_sekali;
 *   - race: dua approve_l1 bersamaan -> tepat satu sukses;
 *   - Q-IRIS5-6: submit tanpa baris jual/beli ditolak;
 *   - R6.4: request_unlock tanpa berita acara DITOLAK; unlock hanya OWNER
 *     dan != pengaju; unlock_granted -> DRAFT (cycle naik), denied -> FINAL;
 *   - Q-IRIS5-8: guard 4b (edit hanya DRAFT) + 4e (realokasi DIBATALKAN
 *     ditolak; jalur SUKSES realokasi tidak diuji di sini - sudah penuh di
 *     realokasi.integration.test.ts, dan memanggilnya di sini menulis audit
 *     COST_REALLOCATION global yang berlomba dengan test 4e).
 *   - Q-IRIS5-4: STAFF scope maker (cancel/edit miliknya saja).
 *
 * Isolasi: tahun 2095 (2096-2100 dipakai test lain), prefix ZZSM.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import {
  approvals,
  auditLog,
  chargeCodes,
  chargeLines,
  costReallocations,
  costReopenRequests,
  customers,
  jobSequence,
  jobs,
  users,
} from "../../src/db/schema/index";
import { createChargeLine } from "../../src/lib/charge-line/index";
import { ajukanRealokasi } from "../../src/lib/realokasi/index";
import {
  approveFinal,
  approveL1,
  cancelJob,
  rejectJob,
  requestUnlock,
  submitJob,
  unlockDenied,
  unlockGranted,
} from "../../src/lib/state-machine/transisi";

const TEST_YEAR = 2095;
const PREFIX = "ZZSM ";
const KODE = "ZZSMBEBAS"; // butuh_vendor = false

let uStaff = { id: "", role: "STAFF" as const }; // maker (fairol)
let uStaff2 = { id: "", role: "STAFF" as const }; // staff lain (lana)
let uMgr = { id: "", role: "MANAGER" as const }; // approver L1 (niken)
let uOwn = { id: "", role: "OWNER" as const }; // approver final (indra)

let customerId = "";
let job1 = ""; // alur penuh + unlock + reject
let job2 = ""; // race paralel
let job3 = ""; // STAFF scope guard (DRAFT, milik fairol)
let job4 = ""; // cancel + realokasi DIBATALKAN
let job5 = ""; // submit tanpa baris
let line4 = ""; // baris biaya job4 (untuk realokasi)

async function buatJob(no: string, running: number, makerId: string) {
  const [j] = await db
    .insert(jobs)
    .values({
      seqScope: "DOM",
      tahun: TEST_YEAR,
      bulan: 1,
      running,
      jobNo: no,
      customerId,
      legFreight: true,
      makerId,
    })
    .returning({ id: jobs.id });
  return j?.id ?? "";
}

async function statusJob(id: string) {
  const [j] = await db
    .select({ status: jobs.status, cycle: jobs.approvalCycle })
    .from(jobs)
    .where(eq(jobs.id, id));
  return j;
}

async function hitungAuditJob(id: string, aksi?: string) {
  const rows = await db
    .select({ aksi: auditLog.aksi })
    .from(auditLog)
    .where(and(eq(auditLog.entitas, "JOB"), eq(auditLog.entitasId, id)));
  return aksi ? rows.filter((r) => r.aksi === aksi).length : rows.length;
}

async function bersihkan() {
  const semuaJob = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.tahun, TEST_YEAR));
  const ids = semuaJob.map((j) => j.id);
  if (ids.length > 0) {
    await db
      .delete(auditLog)
      .where(and(eq(auditLog.entitas, "JOB"), inArray(auditLog.entitasId, ids)));
    await db.delete(costReallocations).where(inArray(costReallocations.originJobId, ids));
    await db
      .delete(costReallocations)
      .where(inArray(costReallocations.destinationJobId, ids));
    await db
      .delete(auditLog)
      .where(
        and(eq(auditLog.entitas, "COST_REALLOCATION"), inArray(auditLog.entitasId, ids)),
      );
    await db.delete(costReopenRequests).where(inArray(costReopenRequests.jobId, ids));
    await db.delete(chargeLines).where(inArray(chargeLines.jobId, ids));
    await db.delete(jobs).where(eq(jobs.tahun, TEST_YEAR));
  }
  await db.delete(jobSequence).where(eq(jobSequence.tahun, TEST_YEAR));
}

describe("state machine job (integrasi DB)", { timeout: 120_000 }, () => {
  beforeAll(async () => {
    const staffRows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.role, "STAFF"));
    const [mgr] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "MANAGER"))
      .limit(1);
    const [own] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "OWNER"))
      .limit(1);
    if (staffRows.length < 2 || !mgr || !own) {
      throw new Error(
        "Seed user kurang: butuh 2 STAFF + MANAGER + OWNER - jalankan seed dulu.",
      );
    }
    const staff1 = staffRows[0];
    const staff2 = staffRows[1];
    if (!staff1 || !staff2) throw new Error("Seed STAFF tidak cukup.");
    uStaff = { id: staff1.id, role: "STAFF" };
    uStaff2 = { id: staff2.id, role: "STAFF" };
    uMgr = { id: mgr.id, role: "MANAGER" };
    uOwn = { id: own.id, role: "OWNER" };

    await bersihkan();
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZSM%"));
    await db
      .insert(chargeCodes)
      .values([{ kode: KODE, keterangan: "Uji SM tanpa vendor", butuhVendor: false }]);
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    const [c] = await db
      .insert(customers)
      .values({ nama: `${PREFIX}Customer` })
      .returning({ id: customers.id });
    customerId = c?.id ?? "";

    job1 = await buatJob("ISLI-95.01-001", 1, uStaff.id);
    job2 = await buatJob("ISLI-95.01-002", 2, uStaff.id);
    job3 = await buatJob("ISLI-95.01-003", 3, uStaff.id);
    job4 = await buatJob("ISLI-95.01-004", 4, uStaff.id);
    job5 = await buatJob("ISLI-95.01-005", 5, uStaff.id);

    // job1 & job2: baris jual & beli > 0 (syarat submit Q-IRIS5-6).
    for (const id of [job1, job2]) {
      await db.insert(chargeLines).values([
        {
          jobId: id,
          chargeCode: KODE,
          sellingIdr: 12_000_000n,
          pencadanganIdr: 10_000_000n,
          createdBy: uStaff.id,
        },
      ]);
    }
    // job4: baris untuk cap realokasi.
    const [l4] = await db
      .insert(chargeLines)
      .values({
        jobId: job4,
        chargeCode: KODE,
        sellingIdr: 8_000_000n,
        pencadanganIdr: 6_000_000n,
        createdBy: uStaff.id,
      })
      .returning({ id: chargeLines.id });
    line4 = l4?.id ?? "";
  });

  afterAll(async () => {
    await bersihkan();
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZSM%"));
    await db.$client.end();
  });

  // ── SUBMIT ────────────────────────────────────────────────────────────────

  it("submit oleh bukan maker DITOLAK walau OWNER", async () => {
    const r = await submitJob(db, uOwn, job1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("pembuat");
  });

  it("submit tanpa baris biaya DITOLAK (Q-IRIS5-6)", async () => {
    const r = await submitJob(db, uStaff, job5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("belum memiliki baris biaya jual");
  });

  it("submit oleh maker -> DIAJUKAN + tepat 1 audit SUBMIT", async () => {
    const r = await submitJob(db, uStaff, job1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DIAJUKAN");
    expect(await hitungAuditJob(job1, "SUBMIT")).toBe(1);
  });

  // ── Guard 4b saat non-DRAFT + scope STAFF ─────────────────────────────────

  it("guard 4b: tambah baris pada job DIAJUKAN DITOLAK (isEditable)", async () => {
    const r = await createChargeLine(db, uOwn, {
      jobId: job1,
      chargeCode: KODE,
      sellingIdr: 100_000,
      pencadanganIdr: 50_000,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("DRAFT");
  });

  it("guard scope: STAFF lain tidak boleh edit job milik bukan dia (DRAFT)", async () => {
    const r = await createChargeLine(db, uStaff2, {
      jobId: job3,
      chargeCode: KODE,
      sellingIdr: 1_000,
      pencadanganIdr: 500,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("miliknya sendiri");
  });

  it("OWNER bebas edit job DRAFT milik siapa pun (guard lolos)", async () => {
    const r = await createChargeLine(db, uOwn, {
      jobId: job3,
      chargeCode: KODE,
      sellingIdr: 1_000,
      pencadanganIdr: 500,
    });
    expect(r.ok).toBe(true);
  });

  // ── APPROVE L1 ────────────────────────────────────────────────────────────

  it("approve_l1 oleh STAFF DITOLAK wewenang", async () => {
    const r = await approveL1(db, uStaff, job1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("approve_l1 oleh MANAGER -> DISETUJUI_1 + approvals tingkat 1 + audit", async () => {
    const r = await approveL1(db, uMgr, job1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DISETUJUI_1");

    const [a] = await db.select().from(approvals).where(eq(approvals.jobId, job1));
    expect(a?.tingkat).toBe(1);
    expect(a?.approverId).toBe(uMgr.id);
    expect(await hitungAuditJob(job1, "APPROVE_L1")).toBe(1);
  });

  // ── APPROVE FINAL ─────────────────────────────────────────────────────────

  it("approve_final oleh MANAGER DITOLAK wewenang (R-A2)", async () => {
    const r = await approveFinal(db, uMgr, job1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("approve_final oleh OWNER (bukan maker) -> FINAL + tingkat 2 + audit", async () => {
    const r = await approveFinal(db, uOwn, job1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("FINAL");
    const rows = await db.select().from(approvals).where(eq(approvals.jobId, job1));
    expect(rows).toHaveLength(2);
    expect(await hitungAuditJob(job1, "APPROVE_FINAL")).toBe(1);
  });

  it("FINAL terminal: submit & cancel & approve DITOLAK", async () => {
    expect((await submitJob(db, uStaff, job1)).ok).toBe(false);
    expect((await cancelJob(db, uOwn, job1, "coba")).ok).toBe(false);
    expect((await approveL1(db, uMgr, job1)).ok).toBe(false);
  });

  it("R-A1: OWNER yang jadi maker tidak bisa approve pekerjaannya sendiri", async () => {
    const jOwn = await buatJob("ISLI-95.01-006", 6, uOwn.id);
    await db.insert(chargeLines).values({
      jobId: jOwn,
      chargeCode: KODE,
      sellingIdr: 5_000_000n,
      pencadanganIdr: 4_000_000n,
    });
    await submitJob(db, uOwn, jOwn);
    const r = await approveL1(db, uOwn, jOwn);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("R-A1");
    // MANAGER (orang lain) boleh - dan tidak deadlock berikutnya.
    const ok = await approveL1(db, uMgr, jOwn);
    expect(ok.ok).toBe(true);
  });

  // ── UNLOCK (R6.4) ─────────────────────────────────────────────────────────

  it("request_unlock TANPA berita acara DITOLAK (R6.4)", async () => {
    const r = await requestUnlock(db, uMgr, job1, "perlu koreksi biaya", "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("berita acara");
  });

  it("request_unlock TANPA alasan DITOLAK", async () => {
    const r = await requestUnlock(db, uMgr, job1, "  ", "https://contoh/ba.pdf");
    expect(r.ok).toBe(false);
  });

  it("request_unlock oleh MANAGER + berita acara -> UNLOCK_REQUESTED + baris reopen DIAJUKAN", async () => {
    const r = await requestUnlock(
      db,
      uMgr,
      job1,
      "Koreksi biaya trucking",
      "https://contoh/berita-acara.pdf",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("UNLOCK_REQUESTED");

    const [req] = await db
      .select()
      .from(costReopenRequests)
      .where(eq(costReopenRequests.jobId, job1));
    expect(req?.status).toBe("DIAJUKAN");
    expect(req?.beritaAcaraFileUrl).toBe("https://contoh/berita-acara.pdf");
    expect(req?.requestedBy).toBe(uMgr.id);
    expect(await hitungAuditJob(job1, "REQUEST_UNLOCK")).toBe(1);
  });

  it("unlock_granted oleh MANAGER DITOLAK (job:unlock = OWNER)", async () => {
    const r = await unlockGranted(db, uMgr, job1, "setuju");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("unlock_granted oleh OWNER ( != pengaju) -> DRAFT + cycle naik 1->2 (R6.2)", async () => {
    const r = await unlockGranted(db, uOwn, job1, "Disetujui, koreksi lalu ajukan ulang");
    expect(r.ok).toBe(true);
    const j = await statusJob(job1);
    expect(j?.status).toBe("DRAFT");
    expect(j?.cycle).toBe(2);
    const [req] = await db
      .select()
      .from(costReopenRequests)
      .where(eq(costReopenRequests.jobId, job1));
    expect(req?.status).toBe("DISETUJUI");
    expect(req?.decidedBy).toBe(uOwn.id);
    expect(await hitungAuditJob(job1, "UNLOCK_GRANTED")).toBe(1);
  });

  // ── Cycle & reject (Q-IRIS5-3) ────────────────────────────────────────────

  it("setelah unlock, edit DRAFT bisa lagi (guard terbuka)", async () => {
    const r = await createChargeLine(db, uStaff, {
      jobId: job1,
      chargeCode: KODE,
      sellingIdr: 50_000,
      pencadanganIdr: 25_000,
    });
    expect(r.ok).toBe(true);
  });

  it("submit ulang + approve L1 cycle baru TIDAK menabrak uq_approval_sekali (no deadlock)", async () => {
    expect((await submitJob(db, uStaff, job1)).ok).toBe(true);
    const r = await approveL1(db, uMgr, job1);
    expect(r.ok).toBe(true);
    const rows = await db.select().from(approvals).where(eq(approvals.jobId, job1));
    // tingkat 1 di cycle 1 & cycle 2.
    expect(rows.filter((x) => x.tingkat === 1)).toHaveLength(2);
  });

  it("reject di DISETUJUI_1 oleh OWNER, alasan wajib, -> DRAFT + cycle 2->3", async () => {
    const tanpa = await rejectJob(db, uOwn, job1, " ");
    expect(tanpa.ok).toBe(false);
    const r = await rejectJob(db, uOwn, job1, "Nilai jual belum final");
    expect(r.ok).toBe(true);
    const j = await statusJob(job1);
    expect(j?.status).toBe("DRAFT");
    expect(j?.cycle).toBe(3);
    expect(await hitungAuditJob(job1, "REJECT")).toBe(1);
  });

  it("unlock_denied: FINAL -> UNLOCK_REQUESTED -> kembali FINAL", async () => {
    await submitJob(db, uStaff, job1);
    await approveL1(db, uMgr, job1);
    await approveFinal(db, uOwn, job1);
    await requestUnlock(db, uMgr, job1, "coba lagi", "https://contoh/ba2.pdf");
    const r = await unlockDenied(db, uOwn, job1, "Tidak cukup dasar");
    expect(r.ok).toBe(true);
    expect((await statusJob(job1))?.status).toBe("FINAL");
    expect((await statusJob(job1))?.cycle).toBe(3); // denied tidak menaikkan cycle
  });

  it("tepat 8 transisi job1 = tepat 8 baris audit JOB (J-INV-6)", async () => {
    // submit, approve_l1, approve_final, request_unlock, unlock_granted,
    // submit(2), approve_l1(2), reject, submit(3), approve_l1(3), approve_final(2),
    // request_unlock(2), unlock_denied = 13
    expect(await hitungAuditJob(job1)).toBe(13);
  });

  // ── Race paralel ──────────────────────────────────────────────────────────

  it("dua approve_l1 BERSAMAAN -> tepat satu sukses", async () => {
    await submitJob(db, uStaff, job2);
    const [a, b] = await Promise.all([
      approveL1(db, uMgr, job2),
      approveL1(db, uOwn, job2), // OWNER juga punya job:approve_first
    ]);
    const sukses = [a, b].filter((x) => x.ok).length;
    expect(sukses).toBe(1);
    // Status akhir DISETUJUI_1, approvals tingkat 1 tepat 1 baris.
    expect((await statusJob(job2))?.status).toBe("DISETUJUI_1");
    const rows = await db.select().from(approvals).where(eq(approvals.jobId, job2));
    expect(rows.filter((x) => x.tingkat === 1)).toHaveLength(1);
  });

  // ── Cancel & DIBATALKAN terminal ─────────────────────────────────────────

  it("STAFF lain tidak boleh cancel job bukan miliknya (Q-IRIS5-4)", async () => {
    const r = await cancelJob(db, uStaff2, job3, "coba");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("miliknya sendiri");
  });

  it("cancel oleh OWNER -> DIBATALKAN + audit CANCEL", async () => {
    const r = await cancelJob(db, uOwn, job3, "Job duplikat");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DIBATALKAN");
    expect(await hitungAuditJob(job3, "CANCEL")).toBe(1);
  });

  it("DIBATALKAN terminal: semua aksi ditolak", async () => {
    expect((await submitJob(db, uStaff, job3)).ok).toBe(false);
    expect((await cancelJob(db, uOwn, job3, "lagi")).ok).toBe(false);
    expect((await rejectJob(db, uOwn, job3, "x")).ok).toBe(false);
  });

  it("guard 4e nyata: setelah job DIBATALKAN, ajukan realokasi DITOLAK", async () => {
    await cancelJob(db, uOwn, job4, "Batal - biaya pindah");
    const r = await ajukanRealokasi(db, uOwn, {
      originChargeLineId: line4,
      originJobId: job4,
      destinationJobId: job2,
      jumlahIdr: 100_000,
      alasan: "uji setelah batal",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("DIBATALKAN");
  });
});
