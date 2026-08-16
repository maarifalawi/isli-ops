import { and, eq, like } from "drizzle-orm";

/*
 * Test integrasi createJob — BUTUH DATABASE_URL (.env.local).
 *
 * Membuktikan matriks leg R10 ditegakkan sampai ke DB (ck_legs backstop),
 * dua tingkat penegakan domestik, RBAC job:create, alokasi nomor, dan TEPAT
 * satu baris audit per job.
 *
 * Isolasi: tahun 2097 (tidak dipakai seed maupun job-sequence test 2099/2100),
 * customer ber-prefix "ZZJOB ", dan cleanup menghapus baris miliknya sendiri
 * (jobs, job_sequence, audit_log JOB, customer) — pola sama dgn test master.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import { auditLog, customers, jobSequence, jobs, users } from "../../src/db/schema/index";
import { createJob } from "../../src/lib/job/index";
import type { PilihanLeg } from "../../src/lib/job/leg-rules";

const TEST_YEAR = 2097;
const PREFIX = "ZZJOB ";

let userId = "";
let customerId = "";
const jobIds: string[] = [];

function L(t: boolean, f: boolean, d: boolean): PilihanLeg {
  return { trucking: t, freight: f, delivery: d };
}

async function bersihkan() {
  // Audit JOB milik test dikenali dari alasan berprefix atau job_no tahun test.
  await db
    .delete(auditLog)
    .where(and(eq(auditLog.entitas, "JOB"), like(auditLog.sesudah, "%ISLI-97.%")));

  await db.delete(jobs).where(eq(jobs.tahun, TEST_YEAR));
  await db.delete(jobSequence).where(eq(jobSequence.tahun, TEST_YEAR));
}

describe(
  "createJob — matriks leg R10 & alokasi (integrasi DB)",
  { timeout: 30_000 },
  () => {
    beforeAll(async () => {
      const [u] = await db.select({ id: users.id }).from(users).limit(1);
      if (!u) throw new Error("Tidak ada user di DB — jalankan seed dulu.");
      userId = u.id;

      await bersihkan();
      await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));

      const [c] = await db
        .insert(customers)
        .values({ nama: `${PREFIX}Customer Uji` })
        .returning({ id: customers.id });
      customerId = c?.id ?? "";
    });

    afterAll(async () => {
      await bersihkan();
      await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
      await db.$client.end();
    });

    const owner = () => ({ id: userId, role: "OWNER" as const });
    const staff = () => ({ id: userId, role: "STAFF" as const });

    const base = (over: Partial<Parameters<typeof createJob>[2]> = {}) => ({
      segmen: "EXP" as const,
      tahun: TEST_YEAR,
      bulan: 6,
      customerId,
      legs: L(false, true, false), // leg 2 saja: sah untuk EXIM tanpa alasan
      ...over,
    });

    // ── EXPORT & IMPORT: kombinasi di luar matriks DITOLAK KERAS ──
    const KERAS_TOLAK: { nama: string; legs: PilihanLeg }[] = [
      { nama: "1+3 tanpa 2", legs: L(true, false, true) },
      { nama: "tanpa leg", legs: L(false, false, false) },
    ];

    for (const segmen of ["EXP", "IMP"] as const) {
      for (const { nama, legs } of KERAS_TOLAK) {
        it(`${segmen}: ${nama} ditolak, tidak ada job & tidak ada nomor terbakar`, async () => {
          const hasil = await createJob(db, owner(), base({ segmen, legs }));
          expect(hasil.ok).toBe(false);
          // Nomor tidak boleh terbakar: transaksi ditolak SEBELUM alokasi, atau
          // rollback membatalkan UPSERT — counter tahun test tetap kosong utk scope ini.
          const seq = await db
            .select()
            .from(jobSequence)
            .where(
              and(eq(jobSequence.tahun, TEST_YEAR), eq(jobSequence.seqScope, segmen)),
            );
          expect(seq).toHaveLength(0);
        });
      }
    }

    // ── EXPORT: kombinasi sah diterima tanpa alasan, nomor teralokasi, audit 1 ──
    it("EXP leg 2 saja diterima tanpa alasan → job DRAFT + audit CREATE 1 baris", async () => {
      const hasil = await createJob(db, owner(), base({ segmen: "EXP", bulan: 7 }));
      expect(hasil.ok).toBe(true);
      if (!hasil.ok) return;
      jobIds.push(hasil.data.id);
      expect(hasil.data.jobNo).toBe("ISLI-97.07-001");

      const [row] = await db.select().from(jobs).where(eq(jobs.id, hasil.data.id));
      expect(row?.status).toBe("DRAFT");
      expect(row?.legOverrideAlasan).toBeNull();
      expect(row?.makerId).toBe(userId);

      const audit = await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entitas, "JOB"), eq(auditLog.entitasId, hasil.data.id)));
      expect(audit).toHaveLength(1);
      expect(audit[0]?.aksi).toBe("CREATE");
    });

    // ── DOMESTIK: di luar default TANPA alasan ditolak; DENGAN alasan diterima ──
    it("DOM leg 2 saja TANPA alasan → ditolak", async () => {
      const hasil = await createJob(
        db,
        owner(),
        base({ segmen: "DOM", bulan: 8, legs: L(false, true, false) }),
      );
      expect(hasil.ok).toBe(false);
    });

    it("DOM leg 2 saja DENGAN alasan → diterima, alasan tersimpan + terekam di audit", async () => {
      const hasil = await createJob(
        db,
        owner(),
        base({
          segmen: "DOM",
          bulan: 8,
          legs: L(false, true, false),
          legOverrideAlasan: "customer antar & ambil sendiri",
        }),
      );
      expect(hasil.ok).toBe(true);
      if (!hasil.ok) return;
      jobIds.push(hasil.data.id);

      const [row] = await db.select().from(jobs).where(eq(jobs.id, hasil.data.id));
      expect(row?.legOverrideAlasan).toBe("customer antar & ambil sendiri");

      const audit = await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entitas, "JOB"), eq(auditLog.entitasId, hasil.data.id)));
      expect(audit).toHaveLength(1);
      expect(audit[0]?.alasan).toContain("override leg");
    });

    it("DOM default 1+2+3 diterima tanpa alasan; alasan usang tidak disimpan", async () => {
      const hasil = await createJob(
        db,
        owner(),
        base({
          segmen: "DOM",
          bulan: 9,
          legs: L(true, true, true),
          legOverrideAlasan: "tidak perlu",
        }),
      );
      expect(hasil.ok).toBe(true);
      if (!hasil.ok) return;
      jobIds.push(hasil.data.id);

      const [row] = await db.select().from(jobs).where(eq(jobs.id, hasil.data.id));
      // default → perluAlasan false → alasan usang TIDAK disimpan
      expect(row?.legOverrideAlasan).toBeNull();
    });

    // ── Kurs USD per job (R8.1): kolom saja, integer, tanpa konversi ──
    it("kurs USD per job tersimpan apa adanya (tanpa konversi); pecahan ditolak", async () => {
      const pecahan = await createJob(
        db,
        owner(),
        base({ segmen: "EXP", bulan: 10, kursX100: 1820000.5 }),
      );
      expect(pecahan.ok).toBe(false);

      const hasil = await createJob(
        db,
        owner(),
        base({ segmen: "EXP", bulan: 10, sellingUsd: 510, kursX100: 1820000 }),
      );
      expect(hasil.ok).toBe(true);
      if (!hasil.ok) return;
      jobIds.push(hasil.data.id);

      const [row] = await db.select().from(jobs).where(eq(jobs.id, hasil.data.id));
      expect(row?.sellingUsd).toBe(510n);
      expect(row?.kursX100).toBe(1820000n);
      // TIDAK ada konversi di 4a: selling_idr tetap default 0.
      expect(row?.sellingIdr).toBe(0n);
    });

    // ── RBAC: peran tak berwenang ditolak (RBAC.md: job.create ✓ semua, jadi
    // tak ada peran STAFF yang ditolak; kita buktikan STAFF DIIZINKAN sesuai matriks) ──
    it("STAFF diizinkan job:create (RBAC.md) → job terbuat", async () => {
      const hasil = await createJob(
        db,
        staff(),
        base({ segmen: "IMP", bulan: 11, legs: L(true, true, true) }),
      );
      expect(hasil.ok).toBe(true);
      if (hasil.ok) jobIds.push(hasil.data.id);
    });
  },
);
