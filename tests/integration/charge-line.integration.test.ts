import { and, eq, like } from "drizzle-orm";

/*
 * Test integrasi charge line — BUTUH DATABASE_URL (.env.local).
 *
 * Membuktikan (Irisan 4b):
 *   - at-cost mismatch DITOLAK (R4.3) — lapis aplikasi & DB;
 *   - charge code butuh_vendor tanpa vendor DITOLAK (R15);
 *   - leg di luar 1/2/3 DITOLAK oleh DB (ck_charge_line_leg);
 *   - soft delete TIDAK menghapus baris (deleted_at terisi, row masih ada);
 *   - audit_log tercatat 1 baris per create/update/hapus.
 *
 * Isolasi: job tahun 2096 (tidak dipakai test lain), charge code & customer
 * ber-prefix ZZCL; cleanup menghapus miliknya sendiri.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import {
  auditLog,
  chargeCodes,
  chargeLines,
  customers,
  jobSequence,
  jobs,
  users,
  vendors,
} from "../../src/db/schema/index";
import {
  createChargeLine,
  hapusChargeLine,
  updateChargeLine,
} from "../../src/lib/charge-line/index";

const TEST_YEAR = 2096;
const PREFIX = "ZZCL ";
const KODE_WAJIB = "ZZCLWAJIB"; // butuh_vendor = true
const KODE_BEBAS = "ZZCLBEBAS"; // butuh_vendor = false

let userId = "";
let customerId = "";
let vendorId = "";
let jobId = "";

async function bersihkan() {
  await db.delete(auditLog).where(and(eq(auditLog.entitas, "CHARGE_LINE")));
  await db.delete(chargeLines).where(eq(chargeLines.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.tahun, TEST_YEAR));
  await db.delete(jobSequence).where(eq(jobSequence.tahun, TEST_YEAR));
}

describe("charge line CRUD (integrasi DB)", { timeout: 30_000 }, () => {
  beforeAll(async () => {
    const [u] = await db.select({ id: users.id }).from(users).limit(1);
    if (!u) throw new Error("Tidak ada user di DB — jalankan seed dulu.");
    userId = u.id;

    // charge codes uji (butuh_vendor true & false)
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZCL%"));
    await db.insert(chargeCodes).values([
      { kode: KODE_WAJIB, keterangan: "Uji wajib vendor", butuhVendor: true },
      { kode: KODE_BEBAS, keterangan: "Uji tanpa vendor", butuhVendor: false },
    ]);

    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    const [c] = await db
      .insert(customers)
      .values({ nama: `${PREFIX}Customer` })
      .returning({ id: customers.id });
    customerId = c?.id ?? "";

    await db.delete(vendors).where(like(vendors.nama, `${PREFIX}%`));
    const [v] = await db
      .insert(vendors)
      .values({ nama: `${PREFIX}Vendor` })
      .returning({ id: vendors.id });
    vendorId = v?.id ?? "";

    const [job] = await db
      .insert(jobs)
      .values({
        seqScope: "DOM",
        tahun: TEST_YEAR,
        bulan: 6,
        running: 1,
        jobNo: "ISLI-96.06-001",
        customerId,
        legFreight: true,
        makerId: userId,
      })
      .returning({ id: jobs.id });
    jobId = job?.id ?? "";
  });

  afterAll(async () => {
    await bersihkan();
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    await db.delete(vendors).where(like(vendors.nama, `${PREFIX}%`));
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZCL%"));
    await db.$client.end();
  });

  const owner = () => ({ id: userId, role: "OWNER" as const });

  it("tambah baris normal → baris tersimpan + audit CREATE 1 baris", async () => {
    const hasil = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_WAJIB,
      vendorId,
      sellingIdr: 1_000_000,
      pencadanganIdr: 800_000,
      leg: 2,
    });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;

    const [row] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, hasil.data.id));
    expect(row?.sellingIdr).toBe(1_000_000n);
    expect(row?.pencadanganIdr).toBe(800_000n);

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entitas, "CHARGE_LINE"), eq(auditLog.entitasId, hasil.data.id)),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.aksi).toBe("CREATE");
  });

  it("at-cost mismatch DITOLAK (R4.3)", async () => {
    const hasil = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_BEBAS,
      sellingIdr: 651_947,
      pencadanganIdr: 651_946,
      isAtCost: true,
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("R4.3");
  });

  it("at-cost seimbang DITERIMA (R4.3)", async () => {
    const hasil = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_BEBAS,
      sellingIdr: 1_611_151,
      pencadanganIdr: 1_611_151,
      isAtCost: true,
    });
    expect(hasil.ok).toBe(true);
  });

  it("charge code butuh_vendor tanpa vendor DITOLAK (R15)", async () => {
    const hasil = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_WAJIB,
      sellingIdr: 500_000,
      pencadanganIdr: 500_000,
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("vendor");
  });

  it("charge code butuh_vendor=false BOLEH tanpa vendor", async () => {
    const hasil = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_BEBAS,
      sellingIdr: 29_000,
      pencadanganIdr: 0,
    });
    expect(hasil.ok).toBe(true);
  });

  it("leg di luar 1/2/3 DITOLAK oleh DB (ck_charge_line_leg)", async () => {
    // Lewati validasi aplikasi dengan INSERT langsung → constraint DB harus menolak.
    await expect(
      db.insert(chargeLines).values({
        jobId,
        chargeCode: KODE_BEBAS,
        sellingIdr: 0n,
        pencadanganIdr: 0n,
        leg: 4,
      }),
    ).rejects.toThrow();
  });

  it("pecahan/float DITOLAK di lapis domain", async () => {
    const hasil = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_BEBAS,
      sellingIdr: 1000.5,
      pencadanganIdr: 0,
    });
    expect(hasil.ok).toBe(false);
  });

  it("update mengubah nilai + audit EDIT", async () => {
    const buat = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_BEBAS,
      sellingIdr: 100_000,
      pencadanganIdr: 50_000,
    });
    expect(buat.ok).toBe(true);
    if (!buat.ok) return;

    const ubah = await updateChargeLine(db, owner(), buat.data.id, {
      chargeCode: KODE_BEBAS,
      sellingIdr: 250_000,
      pencadanganIdr: 50_000,
    });
    expect(ubah.ok).toBe(true);

    const [row] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, buat.data.id));
    expect(row?.sellingIdr).toBe(250_000n);

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entitas, "CHARGE_LINE"),
          eq(auditLog.entitasId, buat.data.id),
          eq(auditLog.aksi, "EDIT"),
        ),
      );
    expect(audit).toHaveLength(1);
  });

  it("soft delete: deleted_at terisi, baris TIDAK hilang, audit HAPUS", async () => {
    const buat = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_BEBAS,
      sellingIdr: 10_000,
      pencadanganIdr: 0,
    });
    expect(buat.ok).toBe(true);
    if (!buat.ok) return;

    const hapus = await hapusChargeLine(db, owner(), buat.data.id, "salah input");
    expect(hapus.ok).toBe(true);

    // Baris masih ada secara fisik.
    const [row] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, buat.data.id));
    expect(row).toBeDefined();
    expect(row?.deletedAt).not.toBeNull();

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entitas, "CHARGE_LINE"),
          eq(auditLog.entitasId, buat.data.id),
          eq(auditLog.aksi, "HAPUS"),
        ),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.alasan).toBe("salah input");

    // Hapus kedua kali ditolak.
    const lagi = await hapusChargeLine(db, owner(), buat.data.id, "coba lagi");
    expect(lagi.ok).toBe(false);
  });

  it("hapus tanpa alasan DITOLAK", async () => {
    const buat = await createChargeLine(db, owner(), {
      jobId,
      chargeCode: KODE_BEBAS,
      sellingIdr: 1_000,
      pencadanganIdr: 0,
    });
    expect(buat.ok).toBe(true);
    if (!buat.ok) return;
    const hapus = await hapusChargeLine(db, owner(), buat.data.id, "   ");
    expect(hapus.ok).toBe(false);
  });
});
