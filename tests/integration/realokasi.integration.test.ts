import { and, eq, inArray, like, or } from "drizzle-orm";

/*
 * Test integrasi realokasi biaya antar job — Irisan 4e (Q06, ADR-0006).
 * BUTUH DATABASE_URL (.env.local).
 *
 * Membuktikan:
 *   - ajukan → baris cost_reallocations pending (approved_by NULL); fisik
 *     charge_lines TIDAK pernah berubah (overlay logis);
 *   - setujui → approved_by/approved_at terisi; approver ≠ pembuat (R-A1);
 *     STAFF tidak punya job:reallocate; job FINAL terkunci saat approve;
 *   - cap ajukan & cap RE-CHECK saat approve (dua proposal satu baris);
 *   - tolak → HARD DELETE proposal pending + audit HAPUS alasan wajib;
 *     proposal disetujui tidak boleh dihapus;
 *   - asal = tujuan ditolak (aplikasi + backstop ck_realloc_not_self);
 *   - guard soft-delete charge line yang punya realokasi ditolak;
 *   - GP asli (fisik) tidak berubah — dua angka terpisah;
 *   - audit REALOKASI 1 baris saat ajukan (job asal + tujuan + baris + alasan).
 *
 * Isolasi: job tahun 2098 — 2096 milik charge-line test, 2097 milik
 * job-create test (hapus-jobs-tahun-2097 di afterAll-nya), 2099/2100 milik
 * job-sequence. Prefix ZZRL; cleanup menghapus miliknya sendiri.
 * Butuh ≥3 user dari seed (ada 4).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import {
  auditLog,
  chargeCodes,
  chargeLines,
  costReallocations,
  customers,
  jobSequence,
  jobs,
  users,
} from "../../src/db/schema/index";
import { hapusChargeLine } from "../../src/lib/charge-line/index";
import { type GpLine, hitungGP } from "../../src/lib/costing/index";
import { rupiah } from "../../src/lib/money/index";
import {
  type PelaksanaRealokasi,
  ajukanRealokasi,
  daftarRealokasiBaris,
  setujuiRealokasi,
  tolakRealokasi,
} from "../../src/lib/realokasi/index";

const TEST_YEAR = 2098;
const PREFIX = "ZZRL ";
const KODE = "ZZRLBEBAS"; // butuh_vendor = false
const PENCADANGAN = 10_000_000n;

/** Pembuat proposal: STAFF punya job:edit tapi TIDAK punya job:reallocate. */
let pembuat: PelaksanaRealokasi = { id: "", role: "STAFF" };
/** Approver utama: MANAGER/OWNER, id ≠ pembuat (R-A1). */
let approver: PelaksanaRealokasi = { id: "", role: "MANAGER" };
/** Approver cadangan (id berbeda) — untuk approve proposal kedua di uji cap. */
let approver2: PelaksanaRealokasi = { id: "", role: "OWNER" };

let customerId = "";
let jobAsalId = "";
let jobTujuanId = "";
let jobTujuan2Id = "";
let lineId = "";

/** Snapshot proposal dalam JSON audit (bigint tersimpan sebagai string desimal). */
interface SnapshotAudit {
  originJobId?: string;
  destinationJobId?: string;
  originChargeLineId?: string;
  jumlahIdr?: string;
  alasan?: string;
}

async function bersihkan() {
  await db.delete(auditLog).where(and(eq(auditLog.entitas, "COST_REALLOCATION")));
  // Buang SEMUA proposal milik uji (asal/tujuan/baris) supaya FK jobs &
  // charge_lines bersih sebelum keduanya dihapus.
  await db
    .delete(costReallocations)
    .where(
      or(
        eq(costReallocations.originChargeLineId, lineId),
        eq(costReallocations.originJobId, jobAsalId),
        inArray(costReallocations.destinationJobId, [jobTujuanId, jobTujuan2Id]),
      ),
    );
  await db
    .delete(chargeLines)
    .where(inArray(chargeLines.jobId, [jobAsalId, jobTujuanId, jobTujuan2Id]));
  await db.delete(jobs).where(eq(jobs.tahun, TEST_YEAR));
  await db.delete(jobSequence).where(eq(jobSequence.tahun, TEST_YEAR));
}

describe("realokasi biaya antar job (integrasi DB)", { timeout: 60_000 }, () => {
  beforeAll(async () => {
    // Dua pelaku berbeda: pembuat STAFF, approver MANAGER/OWNER (R-A1).
    const [uStaff] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.role, "STAFF"), eq(users.aktif, true)))
      .limit(1);
    const [uMgr] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.role, "MANAGER"), eq(users.aktif, true)))
      .limit(1);
    const [uOwn] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.role, "OWNER"), eq(users.aktif, true)))
      .limit(1);
    if (!uStaff || !uMgr || !uOwn || uOwn.id === uMgr.id) {
      throw new Error(
        "Seed user kurang: butuh STAFF + MANAGER + OWNER — jalankan seed dulu.",
      );
    }
    pembuat = { id: uStaff.id, role: uStaff.role };
    approver = { id: uMgr.id, role: uMgr.role };
    approver2 = { id: uOwn.id, role: uOwn.role };

    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZRL%"));
    await db
      .insert(chargeCodes)
      .values([
        { kode: KODE, keterangan: "Uji realokasi tanpa vendor", butuhVendor: false },
      ]);

    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    const [c] = await db
      .insert(customers)
      .values({ nama: `${PREFIX}Customer` })
      .returning({ id: customers.id });
    customerId = c?.id ?? "";

    const [j1] = await db
      .insert(jobs)
      .values({
        seqScope: "DOM",
        tahun: TEST_YEAR,
        bulan: 1,
        running: 1,
        jobNo: "ISLI-98.01-001",
        customerId,
        legFreight: true,
        makerId: pembuat.id,
      })
      .returning({ id: jobs.id });
    jobAsalId = j1?.id ?? "";

    const [j2] = await db
      .insert(jobs)
      .values({
        seqScope: "DOM",
        tahun: TEST_YEAR,
        bulan: 1,
        running: 2,
        jobNo: "ISLI-98.01-002",
        customerId,
        legFreight: true,
        makerId: pembuat.id,
      })
      .returning({ id: jobs.id });
    jobTujuanId = j2?.id ?? "";

    const [j3] = await db
      .insert(jobs)
      .values({
        seqScope: "DOM",
        tahun: TEST_YEAR,
        bulan: 1,
        running: 3,
        jobNo: "ISLI-98.01-003",
        customerId,
        legFreight: true,
        makerId: pembuat.id,
      })
      .returning({ id: jobs.id });
    jobTujuan2Id = j3?.id ?? "";

    // Baris asal IDR: jual 12.000.000, cadang 10.000.000 → GP asal 2.000.000.
    const [line] = await db
      .insert(chargeLines)
      .values({
        jobId: jobAsalId,
        chargeCode: KODE,
        sellingIdr: 12_000_000n,
        pencadanganIdr: PENCADANGAN,
        createdBy: pembuat.id,
      })
      .returning({ id: chargeLines.id });
    lineId = line?.id ?? "";
  });

  afterAll(async () => {
    await bersihkan();
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZRL%"));
    await db.$client.end();
  });

  // ── AJUKAN ────────────────────────────────────────────────────────────────

  it("ajukan IDR biasa → baris pending terbuat, fisik charge line tak berubah, audit REALOKASI", async () => {
    const hasil = await ajukanRealokasi(db, pembuat, {
      originChargeLineId: lineId,
      originJobId: jobAsalId,
      destinationJobId: jobTujuanId,
      jumlahIdr: 3_500_000,
      alasan: "Salah cadangan vendor karena salah ketik",
    });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;

    const [row] = await db
      .select()
      .from(costReallocations)
      .where(eq(costReallocations.id, hasil.data.id));
    expect(row).toBeDefined();
    expect(row?.approvedBy).toBeNull();
    expect(row?.approvedAt).toBeNull();
    expect(row?.jumlahIdr).toBe(3_500_000n);
    expect(row?.originChargeLineId).toBe(lineId);
    expect(row?.originJobId).toBe(jobAsalId);
    expect(row?.destinationJobId).toBe(jobTujuanId);
    expect(row?.createdBy).toBe(pembuat.id);

    // Overlay: baris fisik TIDAK diubah oleh pengajuan.
    const [fisik] = await db.select().from(chargeLines).where(eq(chargeLines.id, lineId));
    expect(fisik?.sellingIdr).toBe(12_000_000n);
    expect(fisik?.pencadanganIdr).toBe(PENCADANGAN);
    expect(fisik?.jobId).toBe(jobAsalId);
    expect(fisik?.deletedAt).toBeNull();
  });

  it("ajukan ke job sendiri DITOLAK (aplikasi, sebelum menyentuh DB)", async () => {
    const hasil = await ajukanRealokasi(db, pembuat, {
      originChargeLineId: lineId,
      originJobId: jobAsalId,
      destinationJobId: jobAsalId,
      jumlahIdr: 100_000,
      alasan: "coba ke job sendiri",
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("tidak boleh sama");
  });

  it("backstop DB: INSERT langsung asal = tujuan DITOLAK ck_realloc_not_self", async () => {
    await expect(
      db.insert(costReallocations).values({
        originChargeLineId: lineId,
        originJobId: jobAsalId,
        destinationJobId: jobAsalId,
        jumlahIdr: 1n,
        alasan: "paksa self",
        createdBy: pembuat.id,
      }),
    ).rejects.toThrow();
  });

  it("ajukan jumlah > pencadangan DITOLAK cap (transaksi rollback total)", async () => {
    const hasil = await ajukanRealokasi(db, pembuat, {
      originChargeLineId: lineId,
      originJobId: jobAsalId,
      destinationJobId: jobTujuanId,
      jumlahIdr: 10_000_001,
      alasan: "melebihi cap",
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("melebihi sisa pencadangan");

    // Tidak ada baris proposal yang tersisa dari percobaan ini.
    const semua = await daftarRealokasiBaris(db, lineId);
    expect(semua).toHaveLength(1);
  });

  it("tepat 1 baris audit REALOKASI: job asal + tujuan + baris + alasan tercatat", async () => {
    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entitas, "COST_REALLOCATION"), eq(auditLog.aksi, "REALOKASI")),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.alasan).toBe("Salah cadangan vendor karena salah ketik");
    expect(audit[0]?.userId).toBe(pembuat.id);

    const sesudah = JSON.parse(audit[0]?.sesudah ?? "{}") as SnapshotAudit;
    expect(sesudah.originJobId).toBe(jobAsalId);
    expect(sesudah.destinationJobId).toBe(jobTujuanId);
    expect(sesudah.originChargeLineId).toBe(lineId);
    expect(sesudah.jumlahIdr).toBe("3500000");
    expect(sesudah.alasan).toBe("Salah cadangan vendor karena salah ketik");
  });

  // ── SETUJUI ───────────────────────────────────────────────────────────────

  it("setujui oleh pembuat sendiri DITOLAK (R-A1)", async () => {
    // Supaya sampai ke cek R-A1 (bukan wewenang), pembuat proposal ini harus
    // punya job:reallocate — pakai MANAGER, lalu ia mencoba menyetujui sendiri.
    const buat = await ajukanRealokasi(db, approver, {
      originChargeLineId: lineId,
      originJobId: jobAsalId,
      destinationJobId: jobTujuanId,
      jumlahIdr: 50_000,
      alasan: "uji R-A1",
    });
    expect(buat.ok).toBe(true);
    if (!buat.ok) return;

    const hasil = await setujuiRealokasi(db, approver, buat.data.id);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("R-A1");

    // Buang proposal uji supaya tidak mencemari hitungan cap/GP berikutnya.
    const buang = await tolakRealokasi(db, approver2, buat.data.id, "proposal uji R-A1");
    expect(buang.ok).toBe(true);
  });

  it("setujui oleh STAFF DITOLAK wewenang (job:reallocate)", async () => {
    const [p] = await daftarRealokasiBaris(db, lineId);
    const hasil = await setujuiRealokasi(db, pembuat, p?.id ?? "");
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("tidak berwenang");
  });

  it("setujui oleh approver lain → approvedBy/approvedAt terisi, approver ≠ pembuat", async () => {
    const [p] = await daftarRealokasiBaris(db, lineId);
    expect(p).toBeDefined();
    const hasil = await setujuiRealokasi(db, approver, p?.id ?? "");
    expect(hasil.ok).toBe(true);

    const [row] = await db
      .select()
      .from(costReallocations)
      .where(eq(costReallocations.id, p?.id ?? ""));
    expect(row?.approvedBy).toBe(approver.id);
    expect(row?.approvedAt).not.toBeNull();
    expect(row?.approvedBy).not.toBe(row?.createdBy);
  });

  it("setujui ulang proposal yang sama DITOLAK", async () => {
    const [p] = await daftarRealokasiBaris(db, lineId);
    const hasil = await setujuiRealokasi(db, approver2, p?.id ?? "");
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("sudah disetujui");
  });

  // ── Cap RE-CHECK saat approve (dua proposal pada satu baris) ─────────────

  it("dua proposal pending lolos saat diajukan (pending lain tidak dihitung cap)", async () => {
    const a = await ajukanRealokasi(db, pembuat, {
      originChargeLineId: lineId,
      originJobId: jobAsalId,
      destinationJobId: jobTujuanId,
      jumlahIdr: 6_000_000,
      alasan: "cadangan pertama",
    });
    expect(a.ok).toBe(true);
    const b = await ajukanRealokasi(db, pembuat, {
      originChargeLineId: lineId,
      originJobId: jobAsalId,
      destinationJobId: jobTujuan2Id,
      jumlahIdr: 6_000_000,
      alasan: "cadangan kedua",
    });
    expect(b.ok).toBe(true);
  });

  it("approve berurutan: yang pertama lolos, yang kedua DITOLAK cap re-check (12jt + 3,5jt > 10jt)", async () => {
    const semua = await daftarRealokasiBaris(db, lineId);
    const pending = semua.filter((s) => s.approvedBy === null);
    expect(pending).toHaveLength(2);
    const p1 = pending[0];
    const p2 = pending[1];

    const s1 = await setujuiRealokasi(db, approver, p1?.id ?? "");
    expect(s1.ok).toBe(true);

    // Approver berbeda supaya bukan R-A1 (pembuat tetap sama).
    const s2 = await setujuiRealokasi(db, approver2, p2?.id ?? "");
    expect(s2.ok).toBe(false);
    if (!s2.ok) expect(s2.error).toContain("melebihi sisa pencadangan");

    // Yang ditolak tetap pending (bukan hilang/terhapus).
    const [masih] = await db
      .select()
      .from(costReallocations)
      .where(eq(costReallocations.id, p2?.id ?? ""));
    expect(masih?.approvedBy).toBeNull();
  });

  it("tolak proposal yang gagal cap → HARD DELETE baris + audit HAPUS alasan tercatat", async () => {
    const semua = await daftarRealokasiBaris(db, lineId);
    const pending = semua.filter((s) => s.approvedBy === null);
    expect(pending).toHaveLength(1);
    const p = pending[0];

    const hasil = await tolakRealokasi(
      db,
      approver,
      p?.id ?? "",
      "Total realokasi melebihi sisa pencadangan baris asal",
    );
    expect(hasil.ok).toBe(true);

    const sisa = await db
      .select()
      .from(costReallocations)
      .where(eq(costReallocations.id, p?.id ?? ""));
    expect(sisa).toHaveLength(0);

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entitas, "COST_REALLOCATION"),
          eq(auditLog.aksi, "HAPUS"),
          eq(auditLog.entitasId, p?.id ?? ""),
        ),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.alasan).toBe("Total realokasi melebihi sisa pencadangan baris asal");
    const sebelum = JSON.parse(audit[0]?.sebelum ?? "{}") as SnapshotAudit;
    expect(sebelum.originJobId).toBe(jobAsalId);
    expect(sebelum.destinationJobId).toBe(jobTujuan2Id);
  });

  it("proposal yang sudah disetujui TIDAK BOLEH dihapus (tolak ditolak)", async () => {
    const semua = await daftarRealokasiBaris(db, lineId);
    const approved = semua.find((s) => s.approvedBy !== null);
    expect(approved).toBeDefined();
    const hasil = await tolakRealokasi(db, approver, approved?.id ?? "", "coba hapus");
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("tidak boleh dihapus");
  });

  // ── FINAL-lock saat approve ───────────────────────────────────────────────

  it("approve DITOLAK saat job asal FINAL (set status langsung lalu restore)", async () => {
    const aju = await ajukanRealokasi(db, pembuat, {
      originChargeLineId: lineId,
      originJobId: jobAsalId,
      destinationJobId: jobTujuanId,
      jumlahIdr: 100_000,
      alasan: "uji final lock",
    });
    expect(aju.ok).toBe(true);
    if (!aju.ok) return;

    await db.update(jobs).set({ status: "FINAL" }).where(eq(jobs.id, jobAsalId));
    try {
      const hasil = await setujuiRealokasi(db, approver, aju.data.id);
      expect(hasil.ok).toBe(false);
      if (!hasil.ok) expect(hasil.error).toContain("FINAL");
    } finally {
      await db.update(jobs).set({ status: "DRAFT" }).where(eq(jobs.id, jobAsalId));
    }

    // Setelah restore, approve proposal ini sukses (dibersihkan di afterAll).
    const lagi = await setujuiRealokasi(db, approver, aju.data.id);
    expect(lagi.ok).toBe(true);
  });

  // ── Guard soft-delete charge line ber-realisasi ──────────────────────────

  it("soft-delete charge line yang punya realokasi terkait DITOLAK dengan pesan jelas", async () => {
    const hasil = await hapusChargeLine(db, approver, lineId, "coba hapus baris");
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toContain("realokasi");

    const [fisik] = await db.select().from(chargeLines).where(eq(chargeLines.id, lineId));
    expect(fisik?.deletedAt).toBeNull();
  });

  // ── GP asli tidak berubah (overlay, dua angka terpisah) ──────────────────

  it("GP fisik tidak berubah setelah realokasi disetujui (dua angka terpisah)", async () => {
    const barisDb = await db
      .select({
        sellingIdr: chargeLines.sellingIdr,
        pencadanganIdr: chargeLines.pencadanganIdr,
        isReimburse: chargeLines.isReimburse,
        deletedAt: chargeLines.deletedAt,
      })
      .from(chargeLines)
      .where(and(eq(chargeLines.jobId, jobAsalId), eq(chargeLines.id, lineId)));

    // GP asli dihitung dari baris fisik apa adanya (brand Rupiah).
    const baris: GpLine[] = barisDb.map((b) => ({
      sellingIdr: rupiah(b.sellingIdr),
      pencadanganIdr: rupiah(b.pencadanganIdr),
      isReimburse: b.isReimburse,
      deletedAt: b.deletedAt,
    }));
    const gpAsli = hitungGP(baris);
    expect(gpAsli).toBe(2_000_000n); // 12.000.000 − 10.000.000

    // Realokasi APPROVED yang membebani baris ini (overlay logis).
    const semua = await daftarRealokasiBaris(db, lineId);
    const totalApproved = semua
      .filter((s) => s.approvedBy !== null)
      .reduce((acc, s) => acc + s.jumlahIdr, 0n);
    // Approved = 3,5jt (awal) + 6jt (lolos cap re-check) + 100k (FINAL-lock).
    expect(totalApproved).toBe(9_600_000n);

    // GP setelah realokasi = GP asli − jumlah disetujui: angka TERPISAH,
    // dihitung dari overlay, bukan dari perubahan fisik.
    const gpSetelah = (gpAsli ?? 0n) - totalApproved;
    expect(gpSetelah).toBe(-7_600_000n);

    // Bukti fisik: baris asal tetap utuh seperti sebelum semua realokasi.
    const [fisik] = await db.select().from(chargeLines).where(eq(chargeLines.id, lineId));
    expect(fisik?.sellingIdr).toBe(12_000_000n);
    expect(fisik?.pencadanganIdr).toBe(PENCADANGAN);
    expect(fisik?.jobId).toBe(jobAsalId);
  });
});
